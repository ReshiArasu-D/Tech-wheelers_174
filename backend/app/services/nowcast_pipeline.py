"""
Single End-to-End Nowcasting Pipeline Entry Point for SIH 26084.
Executes the full 13-stage scientific flow:

Input
 ↓
1. Quality Control (QC & Outlier Filter)
 ↓
2. Synchronization (Temporal Alignment)
 ↓
3. Spatial Alignment (3.7 km native -> common grid)
 ↓
4. Radar Encoder + Atmosphere Encoder
 ↓
5. Fusion (StormFeatureFusion representation)
 ↓
6. Storm Evolution (Detection + Persistent Tracking + Optical Flow)
 ↓
7. Multi-Horizon Forecasting (+15m, +30m, +60m fine; +180m, +360m corridors)
 ↓
8. Multi-Hazard Assessment (Lightning, Thunderstorm, Hail, Heavy Rain, Cloudburst, Downburst)
 ↓
9. Uncertainty Quantification (Temperature Scaling + Conformal Intervals)
 ↓
10. Exposure & Risk Engine (0-100 Score)
 ↓
11. Arrival Engine (Target Countdown Displays)
 ↓
12. Alert Candidate Generation (Human Approval Required)
"""
import time
from typing import Dict, List, Optional, Any
import numpy as np

from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service
from backend.app.services.tracking import tracking_service
from backend.app.models.optical_flow import optical_flow_model
from backend.app.models.convgru import convgru_nowcaster
from backend.app.models.uncertainty import uncertainty_engine
from backend.app.services.hazards import hazard_service
from backend.app.services.risk import risk_engine
from backend.app.services.arrival import arrival_engine
from backend.app.services.forecasting import forecasting_pipeline
from backend.app.services.model_registry import model_registry
from backend.app.models.dwr_convgru import dwr_service
from backend.app.models.atmosphere import atmosphere_service
from backend.app.services.nowcast_logger import nowcast_logger
from backend.app.services.interfaces import (
    RadarRepresentation,
    AtmosphereRepresentation,
    FusedStormRepresentation
)


class ConvectiveNowcastPipeline:
    def __init__(self):
        self.registry = model_registry
        self.logger = nowcast_logger

    def run_nowcast(self, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Unified end-to-end nowcast execution function.
        Can be called directly as: run_nowcast(input_data)
        """
        start_time = time.time()
        input_data = input_data or {}

        # ----------------------------------------------------
        # 1. Ingestion & Timestamp Resolution
        # ----------------------------------------------------
        available_ts = satellite_service.get_available_timestamps()
        if not available_ts:
            raise RuntimeError("No historical INSAT-3D frames indexed in dataset.")

        req_timestamp = input_data.get("timestamp")
        if not req_timestamp or req_timestamp not in available_ts:
            req_timestamp = available_ts[min(4, len(available_ts) - 1)]

        curr_idx = available_ts.index(req_timestamp)
        prev_idx = max(0, curr_idx - 1)
        prev_ts = available_ts[prev_idx]

        # ----------------------------------------------------
        # 2. Quality Control (QC) & Temporal Synchronization
        # ----------------------------------------------------
        raw_curr = satellite_service.read_frame(req_timestamp)
        raw_prev = satellite_service.read_frame(prev_ts)
        era5_context = input_data.get("era5_data") or satellite_service.get_era5_context(req_timestamp)

        # QC: Clamp thermal brightness temperatures to physical meteorology range [170K, 330K]
        curr_tb = np.clip(raw_curr.get("tb_kelvin", raw_curr.get("convective_intensity")), 170.0, 330.0)
        prev_tb = np.clip(raw_prev.get("tb_kelvin", raw_prev.get("convective_intensity")), 170.0, 330.0)

        # ----------------------------------------------------
        # 3. Spatial Alignment (Common 128x128 Grid)
        # ----------------------------------------------------
        TARGET_H, TARGET_W = 128, 128
        import cv2
        if curr_tb.shape != (TARGET_H, TARGET_W):
            curr_tb = cv2.resize(curr_tb, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
            prev_tb = cv2.resize(prev_tb, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
            if "lat_grid" in raw_curr and raw_curr["lat_grid"].shape != (TARGET_H, TARGET_W):
                raw_curr["lat_grid"] = cv2.resize(raw_curr["lat_grid"], (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
                raw_curr["lon_grid"] = cv2.resize(raw_curr["lon_grid"], (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
            if "lat_grid" in raw_prev and raw_prev["lat_grid"].shape != (TARGET_H, TARGET_W):
                raw_prev["lat_grid"] = cv2.resize(raw_prev["lat_grid"], (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
                raw_prev["lon_grid"] = cv2.resize(raw_prev["lon_grid"], (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
            raw_curr["tb_kelvin"] = curr_tb
            raw_prev["tb_kelvin"] = prev_tb
            raw_curr["convective_intensity"] = np.clip((260.0 - curr_tb) / 70.0, 0.0, 1.0).astype(np.float32)
            raw_prev["convective_intensity"] = np.clip((260.0 - prev_tb) / 70.0, 0.0, 1.0).astype(np.float32)

        # Convective initiation intensity calculation
        ci_result = detection_service.compute_convective_initiation(raw_curr, raw_prev, era5_context)
        curr_intensity = raw_curr["convective_intensity"]
        prev_intensity = raw_prev["convective_intensity"]

        # ----------------------------------------------------
        # 4. Sensor Mask & Simulation Overrides
        # ----------------------------------------------------
        sensor_status = {
            "insat": "available",
            "era5": "available",
            "imerg": "available",
            "dwr": "unavailable",
            "lightning": "unavailable"
        }

        # Check for actual incoming DWR frames and trained checkpoint
        incoming_radar = input_data.get("radar_data")
        dwr_prediction = None
        radar_features = None
        if incoming_radar is not None and dwr_service.is_loaded:
            dwr_prediction = dwr_service.predict_from_incoming(incoming_radar)
            radar_features = dwr_service.extract_features_from_incoming(incoming_radar)

        if dwr_prediction is not None:
            sensor_status["dwr"] = "available"

        if "sensor_override" in input_data and input_data["sensor_override"]:
            sensor_status.update(input_data["sensor_override"])

        # ----------------------------------------------------
        # 5. Radar & Atmosphere Representation Encoders
        # ----------------------------------------------------
        has_radar = sensor_status.get("dwr") == "available" and dwr_service.is_loaded and (dwr_prediction is not None or radar_features is not None)
        if has_radar:
            refl = dwr_prediction if dwr_prediction is not None else incoming_radar.get("reflectivity", np.zeros((128, 128), dtype=np.float32))
            feat = radar_features if radar_features is not None else np.zeros((32, 128, 128), dtype=np.float32)
            radar_rep = RadarRepresentation(
                feature_map=feat,
                reflectivity_dbz=refl,
                is_available=True,
                sensor_provenance="ISRO TERLS DWR C-band (ConvGRU Live Inference)"
            )
        else:
            radar_rep = RadarRepresentation(
                feature_map=np.zeros((32, 128, 128), dtype=np.float32),
                reflectivity_dbz=np.zeros((128, 128), dtype=np.float32),
                is_available=False,
                sensor_provenance="Degraded (Satellite/ERA5 Proxy Active)"
            )

        # Extract genuine 32-channel atmosphere representation [32, 128, 128]
        atm_features = atmosphere_service.extract_features(
            tir_brightness_temp_k=curr_tb,
            cooling_rate_k_hr=ci_result.get("cooling_rate_k_hr", np.zeros_like(curr_tb)),
            era5_context=era5_context
        )

        atm_rep = AtmosphereRepresentation(
            feature_map=atm_features,
            tir_brightness_temp_k=curr_tb,
            cooling_rate_k_hr=ci_result.get("cooling_rate_k_hr", np.zeros_like(curr_tb)),
            era5_cape=float(era5_context.get("parameters", {}).get("cape_j_kg", {}).get("mean", 2200.0)),
            era5_shear=float(era5_context.get("parameters", {}).get("bulk_shear_0_6km_ms", {}).get("mean", 20.0)),
            era5_pw=float(era5_context.get("parameters", {}).get("precipitable_water_mm", {}).get("mean", 52.0)),
            is_available=True
        )

        # ----------------------------------------------------
        # 6. Storm Feature Fusion (Dual Branch)
        # ----------------------------------------------------
        if has_radar and radar_rep.is_available:
            fused_tensor, fusion_stats = atmosphere_service.fuse_features(
                radar_rep.feature_map, atm_rep.feature_map
            )
            fusion_mode = "FULL_MULTIMODAL"
            confidence_discount = 1.0
        else:
            fused_tensor = atm_rep.feature_map
            fusion_mode = "REDUCED_ATMOSPHERE_ONLY"
            confidence_discount = 0.75
            fusion_stats = {
                "min": float(fused_tensor.min()),
                "max": float(fused_tensor.max()),
                "mean": float(fused_tensor.mean()),
                "std": float(fused_tensor.std())
            }

        fused_state = FusedStormRepresentation(
            fused_features=fused_tensor,
            convective_mask=ci_result.get("ci_mask", np.zeros_like(curr_intensity, dtype=bool)),
            fusion_mode=fusion_mode,
            radar_available=has_radar,
            confidence_discount=confidence_discount
        )

        # ----------------------------------------------------
        # 7. Storm Evolution (Detection, Tracking & Dense Flow)
        # ----------------------------------------------------
        detected_storms = detection_service.detect_storm_cells(raw_curr, ci_result)

        if prev_idx != curr_idx:
            prev_detected = detection_service.detect_storm_cells(raw_prev)
            prev_tracked = tracking_service.track_cells([], prev_detected, prev_ts)
            tracked_storms = tracking_service.track_cells(prev_tracked, detected_storms, req_timestamp)
        else:
            tracked_storms = tracking_service.track_cells([], detected_storms, req_timestamp)

        dense_flow = optical_flow_model.compute_dense_flow(prev_intensity, curr_intensity)

        for s in tracked_storms:
            motion = optical_flow_model.compute_storm_motion(dense_flow, s, curr_intensity.shape)
            s["motion"] = motion

        # ----------------------------------------------------
        # 8. Multi-Horizon Forecasting Engine
        # ----------------------------------------------------
        model_override = input_data.get("model_override", "CONVGRU")
        if model_override == "PERSISTENCE":
            forecasts = forecasting_pipeline._generate_persistence_forecasts(raw_curr, tracked_storms)
        elif model_override == "OPTICAL_FLOW":
            forecasts = forecasting_pipeline._generate_pure_optical_flow_forecasts(raw_curr, dense_flow, tracked_storms)
        else:
            forecasts = convgru_nowcaster.generate_horizon_forecasts(
                raw_curr, raw_prev, dense_flow, tracked_storms, era5_context
            )

        # ----------------------------------------------------
        # 9. Multi-Hazard Assessment (All 6 hazards)
        # ----------------------------------------------------
        hazards = hazard_service.evaluate_hazards(
            raw_curr, tracked_storms, era5_context, sensor_status, horizon_min=30
        )

        # ----------------------------------------------------
        # 10. Conformal Uncertainty Quantification
        # ----------------------------------------------------
        uncertainty_info = uncertainty_engine.get_system_uncertainty_state(sensor_status)

        # ----------------------------------------------------
        # 11. Hazard Arrival Engine
        # ----------------------------------------------------
        arrivals = arrival_engine.compute_arrivals(tracked_storms, forecasts, sensor_status)

        # ----------------------------------------------------
        # 12. Static Exposure & Risk Engine
        # ----------------------------------------------------
        risk = risk_engine.compute_risk(hazards, tracked_storms, arrivals, sensor_status)

        # ----------------------------------------------------
        # 13. Alert Candidate Generation (HITL)
        # ----------------------------------------------------
        alert_candidates = forecasting_pipeline._generate_alert_candidates(
            req_timestamp, risk, arrivals, hazards, tracked_storms
        )

        # ----------------------------------------------------
        # 14. Full GeoJSON FeatureCollection Assembly
        # ----------------------------------------------------
        geojson_features = []
        for s in tracked_storms:
            poly = s.get("polygon_geojson")
            if poly:
                geojson_features.append({
                    "type": "Feature",
                    "id": s.get("id"),
                    "geometry": poly,
                    "properties": {
                        "storm_id": s.get("id"),
                        "severity": s.get("severity", "MEDIUM"),
                        "intensity": s.get("intensity", 0.5),
                        "min_tb_k": s.get("min_tb_k", 220.0),
                        "cooling_rate": s.get("cooling_rate_k_hr", 4.0),
                        "area_km2": s.get("area_km2", 500.0),
                        "speed_kmh": s.get("motion", {}).get("speed_kmh", 25.0),
                        "bearing_deg": s.get("motion", {}).get("bearing_deg", 45.0),
                        "hazards": {h: v.get("severity") for h, v in hazards.items()}
                    }
                })

        # Add forecast projection polygons
        for hz, f_data in forecasts.items():
            for p_storm in f_data.get("storm_polygons", []):
                poly = p_storm.get("polygon_geojson")
                if poly:
                    geojson_features.append({
                        "type": "Feature",
                        "geometry": poly,
                        "properties": {
                            "type": "FORECAST_PROJECTION",
                            "horizon": hz,
                            "target_timestamp": f_data.get("target_timestamp"),
                            "confidence": f_data.get("confidence", 0.6)
                        }
                    })

        geojson = {
            "type": "FeatureCollection",
            "features": geojson_features
        }

        # Final Assembly
        model_trained = convgru_nowcaster.is_trained
        model_label = "TRAINED" if model_trained else "TRAINED MODEL NOT AVAILABLE"
        duration_ms = (time.time() - start_time) * 1000.0

        # Telemetry logging
        self.logger.log_inference_run(
            input_timestamp=req_timestamp,
            input_shape=curr_intensity.shape,
            model_checkpoint=self.registry.descriptors["radar_encoder"].loaded_path or "radar_convgru.pt",
            horizons=[15, 30, 60, 180, 360],
            hazard_models={k: v.get("model_status", "UNKNOWN") for k, v in hazards.items()},
            storm_count=len(tracked_storms),
            forecast_shapes={k: len(v.get("storm_polygons", []) or v.get("corridors", [])) for k, v in forecasts.items()},
            duration_ms=duration_ms,
            processing_status="SUCCESS"
        )

        date_slug = req_timestamp[:10].replace("-", "") if req_timestamp else "LIVE"
        return {
            "event_id": input_data.get("event_id") or ("EVENT-20191107-BOB-01" if date_slug == "20191107" else f"EVENT-{date_slug}-NOWCAST"),
            "timestamp": req_timestamp,
            "pipeline_version": "convnowcast-v0.1-multimodal",
            "model_status": convgru_nowcaster.model_status,
            "is_convgru_trained": model_trained,
            "fusion_mode": fused_state.fusion_mode,
            "fusion_metadata": {
                "fusion_mode": fused_state.fusion_mode,
                "radar_available": fused_state.radar_available,
                "confidence_discount": fused_state.confidence_discount,
                "radar_feature_shape": list(radar_rep.feature_map.shape),
                "atmosphere_feature_shape": list(atm_rep.feature_map.shape),
                "fused_feature_shape": list(fused_state.fused_features.shape),
                "fusion_stats": fusion_stats
            },
            "provenance_badge": {
                "prototype": "INSAT + ERA5 Historical Replay",
                "production": "DWR + INSAT + Lightning + ERA5",
                "model": f"{model_override} ({model_label})" if model_override == "CONVGRU" else model_override,
                "version": "convnowcast-v0.1",
                "grid_resolution": "3.7 km native INSAT / 1.0 km radar-anchored target",
                "checkpoint_status": model_label
            },
            "sensor_status": {
                "insat": sensor_status["insat"],
                "era5": sensor_status["era5"],
                "imerg": sensor_status["imerg"],
                "dwr": sensor_status["dwr"],
                "lightning": sensor_status["lightning"],
                "radar_coverage_gap": True,
                "overall_confidence_discount": uncertainty_info["confidence_discount_factor"],
                "mode_label": "PROTOTYPE: INSAT + ERA5 REDUCED SENSOR FUSION" if sensor_status["dwr"] != "available" else "FULL OPERATIONAL FUSION"
            },
            "storms": tracked_storms,
            "storm_objects": tracked_storms,
            "forecasts": forecasts,
            "forecast_horizons": forecasts,
            "hazards": hazards,
            "uncertainty": uncertainty_info,
            "risk": risk,
            "exposure": risk.get("exposure_summary", {}),
            "arrival": arrivals,
            "geojson": geojson,
            "alert_candidates": alert_candidates,
            "latency_ms": round(duration_ms, 2)
        }


# Singleton pipeline orchestrator
nowcast_pipeline = ConvectiveNowcastPipeline()

# Top-level standalone entry points
def run_nowcast(input_data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
    """Single end-to-end nowcast entry point function."""
    merged = dict(input_data or {})
    merged.update(kwargs)
    return nowcast_pipeline.run_nowcast(merged)

def run_nowcast_pipeline(input_data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
    """Canonical orchestration entry point for CO-NOWCAST pipeline."""
    merged = dict(input_data or {})
    merged.update(kwargs)
    return nowcast_pipeline.run_nowcast(merged)
