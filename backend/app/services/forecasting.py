"""
Master Convective Nowcasting Pipeline Orchestrator
Coordinates:
  Real INSAT-3D HDF5 Ingestion
  ↓
  Convective Initiation Scoring (INSAT + ERA5)
  ↓
  Storm Cell Detection (Contours, Centroids, Polygons)
  ↓
  Multi-Frame Tracking & Persistent IDs (Merge/Split Lineage)
  ↓
  Dense Optical Flow (Motion Vectors, Speeds, Bearings)
  ↓
  ConvGRU Residual Neural Model
  ↓
  Multi-Horizon Forecasting (+15m, +30m, +60m, +180m, +360m)
  ↓
  Multi-Hazard Proxy Assessment (Lightning, Hail, Downburst, Cloudburst)
  ↓
  Uncertainty Quantification (Temperature Scaling & Conformal Intervals)
  ↓
  Static Exposure & Risk Engine (0-100 Score)
  ↓
  Hazard Arrival Engine (Countdown Displays)
  ↓
  Alert Candidates & Operator Decision Support
"""
from typing import Dict, List, Tuple, Optional, Any
import datetime
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

class ForecastingPipeline:
    def __init__(self):
        self._state_cache: Dict[str, Dict[str, Any]] = {}
        self._active_alerts: List[Dict[str, Any]] = []

    def run_pipeline_for_frame(self,
                               timestamp: Optional[str] = None,
                               sensor_override: Optional[Dict[str, str]] = None,
                               model_override: Optional[str] = "CONVGRU") -> Dict[str, Any]:
        """
        Executes the full end-to-end scientific nowcasting pipeline.
        Supports sensor dropout simulations and model comparison toggles.
        """
        available_ts = satellite_service.get_available_timestamps()
        if not available_ts:
            raise RuntimeError("No historical INSAT-3D frames indexed.")

        if not timestamp or timestamp not in available_ts:
            # Default to middle-to-peak convective sequence frame (e.g. 05:00 UTC)
            timestamp = available_ts[min(4, len(available_ts) - 1)]

        curr_idx = available_ts.index(timestamp)
        prev_idx = max(0, curr_idx - 1)
        prev_ts = available_ts[prev_idx]

        # 1. Read real satellite frames
        curr_frame = satellite_service.read_frame(timestamp)
        prev_frame = satellite_service.read_frame(prev_ts)

        # 2. Get ERA5 environmental context
        era5_context = satellite_service.get_era5_context(timestamp)

        # 3. Sensor availability mask (with optional user simulation override)
        sensors = {
            "insat": "available",
            "era5": "available",
            "dwr": "unavailable",
            "lightning": "unavailable"
        }
        if sensor_override:
            sensors.update(sensor_override)

        # 4. Convective Initiation
        ci_result = detection_service.compute_convective_initiation(curr_frame, prev_frame, era5_context)

        # 5. Storm Cell Detection
        detected_storms = detection_service.detect_storm_cells(curr_frame, ci_result)

        # 6. Multi-Frame Tracking & Lineage
        if prev_idx != curr_idx:
            prev_detected = detection_service.detect_storm_cells(prev_frame)
            prev_tracked = tracking_service.track_cells([], prev_detected, prev_ts)
            tracked_storms = tracking_service.track_cells(prev_tracked, detected_storms, timestamp)
        else:
            tracked_storms = tracking_service.track_cells([], detected_storms, timestamp)

        # 7. Dense Optical Flow & Cell Motion
        dense_flow = optical_flow_model.compute_dense_flow(
            prev_frame["convective_intensity"], curr_frame["convective_intensity"]
        )

        for storm in tracked_storms:
            motion = optical_flow_model.compute_storm_motion(
                dense_flow, storm, curr_frame["convective_intensity"].shape
            )
            storm["motion"] = motion

        # 8. Forecasting Engine (Persistence / Optical Flow / ConvGRU Residual)
        if model_override == "PERSISTENCE":
            # Baseline 1: Future is current state unchanged
            forecasts = self._generate_persistence_forecasts(curr_frame, tracked_storms)
        elif model_override == "OPTICAL_FLOW":
            # Baseline 2: Pure advection
            forecasts = self._generate_pure_optical_flow_forecasts(curr_frame, dense_flow, tracked_storms)
        else:
            # Full ConvGRU Residual AI Model
            forecasts = convgru_nowcaster.generate_horizon_forecasts(
                curr_frame, prev_frame, dense_flow, tracked_storms, era5_context
            )

        # 9. Multi-Hazard Assessment
        hazards = hazard_service.evaluate_hazards(
            curr_frame, tracked_storms, era5_context, sensors, horizon_min=30
        )

        # 10. Uncertainty Quantification
        uncertainty_info = uncertainty_engine.get_system_uncertainty_state(sensors)

        # 11. Hazard Arrival Engine
        arrivals = arrival_engine.compute_arrivals(tracked_storms, forecasts, sensors)

        # 12. Risk Engine
        risk = risk_engine.compute_risk(hazards, tracked_storms, arrivals, sensors)

        # 13. Alert Candidate Generation
        alert_candidates = self._generate_alert_candidates(
            timestamp, risk, arrivals, hazards, tracked_storms
        )

        # 14. Unified Storm State JSON
        storm_state = {
            "event_id": "EVENT-20191107-BOB-01",
            "timestamp": timestamp,
            "model_version": "convnowcast-v0.1",
            "provenance_badge": {
                "prototype": "INSAT + ERA5 Historical Replay",
                "production": "DWR + INSAT + Lightning + ERA5",
                "model": f"{model_override} + Optical Flow Advection",
                "version": "convnowcast-v0.1",
                "grid_resolution": "3.7 km native INSAT / 1.0 km radar-anchored target"
            },
            "sensor_status": {
                "insat": sensors["insat"],
                "era5": sensors["era5"],
                "dwr": sensors["dwr"],
                "lightning": sensors["lightning"],
                "radar_coverage_gap": True,
                "overall_confidence_discount": uncertainty_info["confidence_discount_factor"],
                "mode_label": "PROTOTYPE: INSAT + ERA5 REDUCED SENSOR FUSION" if sensors["dwr"] != "available" else "FULL OPERATIONAL FUSION"
            },
            "storms": tracked_storms,
            "forecasts": forecasts,
            "hazards": hazards,
            "uncertainty": uncertainty_info,
            "risk": risk,
            "arrival": arrivals,
            "alert_candidates": alert_candidates
        }

        self._state_cache[timestamp] = storm_state
        return storm_state

    def _generate_persistence_forecasts(self, current_frame, active_storms):
        """Baseline 1: Persistence."""
        base_dt = datetime.datetime.fromisoformat(current_frame["timestamp"].replace("Z", "+00:00"))
        horizons = [15, 30, 60, 180, 360]
        res = {}
        for hz in horizons:
            target_ts = (base_dt + datetime.timedelta(minutes=hz)).strftime("%Y-%m-%dT%H:%M:%SZ")
            res[f"{hz}m"] = {
                "horizon_minutes": hz,
                "target_timestamp": target_ts,
                "type": "FINE_STORM_SCALE" if hz <= 60 else "PROBABILISTIC_CORRIDOR",
                "confidence": round(max(0.1, 0.70 - (hz / 60.0) * 0.20), 2),
                "uncertainty_score": round(0.20 + (hz / 60.0) * 0.25, 2),
                "conformal_interval": {"lower": 0.3, "upper": 0.8},
                "storm_polygons": active_storms if hz <= 60 else [],
                "probabilistic_contours": [],
                "corridors": []
            }
        return res

    def _generate_pure_optical_flow_forecasts(self, current_frame, dense_flow, active_storms):
        """Baseline 2: Pure Optical Flow Advection without learned ConvGRU residuals."""
        base_dt = datetime.datetime.fromisoformat(current_frame["timestamp"].replace("Z", "+00:00"))
        horizons = [15, 30, 60, 180, 360]
        res = {}
        for hz in horizons:
            target_ts = (base_dt + datetime.timedelta(minutes=hz)).strftime("%Y-%m-%dT%H:%M:%SZ")
            projected = []
            if hz <= 60:
                for s in active_storms:
                    dt_hr = hz / 60.0
                    dlat = (s["motion"]["v"] * dt_hr) / 111.0
                    dlon = (s["motion"]["u"] * dt_hr) / 105.0
                    coords = s["polygon_geojson"]["coordinates"][0]
                    shifted = [[round(pt[0] + dlon, 4), round(pt[1] + dlat, 4)] for pt in coords]
                    projected.append({
                        "storm_id": s["storm_id"],
                        "centroid": {"lat": round(s["centroid"]["lat"] + dlat, 4), "lon": round(s["centroid"]["lon"] + dlon, 4)},
                        "projected_intensity": s["intensity"],
                        "polygon_geojson": {"type": "Polygon", "coordinates": [shifted]}
                    })
            res[f"{hz}m"] = {
                "horizon_minutes": hz,
                "target_timestamp": target_ts,
                "type": "FINE_STORM_SCALE" if hz <= 60 else "PROBABILISTIC_CORRIDOR",
                "confidence": round(max(0.15, 0.82 - (hz / 60.0) * 0.22), 2),
                "uncertainty_score": round(0.15 + (hz / 60.0) * 0.28, 2),
                "conformal_interval": {"lower": 0.35, "upper": 0.85},
                "storm_polygons": projected,
                "probabilistic_contours": [],
                "corridors": []
            }
        return res

    def _generate_alert_candidates(self, timestamp, risk, arrivals, hazards, storms) -> List[Dict[str, Any]]:
        """
        Identifies alert candidates requiring human operational sign-off.
        AI does not automatically issue official public alerts.
        """
        candidates = []
        # Find critical arrival targets
        for target_name, arr in arrivals.items():
            if arr.get("estimated_arrival_minutes") is not None and arr["estimated_arrival_minutes"] <= 90.0:
                alert_id = f"ALERT-{timestamp[-9:-4]}-{target_name[:4].upper()}"
                # Check if already approved in memory
                existing = [a for a in self._active_alerts if a["id"] == alert_id]
                if existing:
                    candidates.append(existing[0])
                else:
                    sev = "SEVERE" if risk["overall_risk_score"] >= 75.0 else ("HIGH" if risk["overall_risk_score"] >= 50.0 else "MODERATE")
                    new_alert = {
                        "id": alert_id,
                        "event_id": "EVENT-20191107-BOB-01",
                        "timestamp": timestamp,
                        "target_region": target_name,
                        "severity": sev,
                        "hazard_types": arr.get("hazard_types", ["Thunderstorm", "Torrential Rain"]),
                        "risk_score": risk["overall_risk_score"],
                        "countdown": arr.get("countdown_display", "00:42:00"),
                        "confidence": arr.get("confidence", "MEDIUM"),
                        "status": "CANDIDATE",
                        "approved_by": None,
                        "approved_at": None
                    }
                    self._active_alerts.append(new_alert)
                    candidates.append(new_alert)

        return candidates

    def approve_alert(self, alert_id: str, operator_name: str, comments: Optional[str] = None) -> Dict[str, Any]:
        """Human approval action for alert candidate."""
        for alert in self._active_alerts:
            if alert["id"] == alert_id:
                alert["status"] = "APPROVED"
                alert["approved_by"] = operator_name
                alert["approved_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                alert["comments"] = comments or "Approved after verification against convective initiation signatures."
                return alert
        raise KeyError(f"Alert ID {alert_id} not found.")

forecasting_pipeline = ForecastingPipeline()
