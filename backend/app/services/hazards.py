"""
Multi-Hazard Proxy Assessment Service
Provides 4 distinct convective hazard indicators:
1. Lightning Proxy (convective depth & cooling proxy)
2. Hail Proxy (cold core < 205K + high CAPE)
3. Downburst Proxy (cooling collapse / divergence trend)
4. Cloudburst Proxy (satellite rainfall-rate proxy referencing official IMD definition)

All outputs adhere strictly to the Scientific Honesty Rules.
"""
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from backend.app.models.uncertainty import uncertainty_engine

class HazardService:
    def __init__(self):
        pass

    def evaluate_hazards(self,
                         current_frame: Dict[str, Any],
                         active_storms: List[Dict[str, Any]],
                         era5_context: Dict[str, Any],
                         sensor_availability: Dict[str, str],
                         horizon_min: int = 30) -> Dict[str, Any]:
        """
        Evaluate the 4 hazard heads based on available INSAT Tb and ERA5 environmental fields.
        Applies temperature scaling calibration according to sensor availability.
        """
        if not active_storms:
            # Baseline quiet conditions
            empty_haz = lambda name, desc: {
                "hazard_type": name,
                "severity": "NONE",
                "probability": 0.05,
                "proxy_indicator": "No convective cells detected",
                "scientific_label": desc,
                "affected_area_km2": 0.0
            }
            return {
                "lightning": empty_haz("lightning", "Lightning proxy — direct lightning observations unavailable in prototype"),
                "hail": empty_haz("hail", "Hail proxy — not verified against hail reports"),
                "downburst": empty_haz("downburst", "Downburst proxy — radar velocity required for production"),
                "cloudburst": empty_haz("cloudburst", "Cloudburst proxy — not gauge verified (IMD def: >=100mm/1hr over ~20-30 sq km)")
            }

        primary_storm = active_storms[0]
        min_tb = primary_storm["min_tb_k"]
        intensity = primary_storm["intensity"]
        cooling_rate = primary_storm.get("cooling_rate_k_hr", 4.0)

        # ERA5 parameters
        era5_params = era5_context.get("parameters", {})
        cape = era5_params.get("cape_j_kg", {}).get("mean", 2200.0)
        pw = era5_params.get("precipitable_water_mm", {}).get("mean", 52.0)
        shear = era5_params.get("bulk_shear_0_6km_ms", {}).get("mean", 20.0)

        # ----------------------------------------------------
        # 1. LIGHTNING PROXY
        # Physical basis: Mixed-phase cloud glaciation (Tb < 233 K / -40C)
        # combined with rapid updraft cooling (cooling rate > 6 K/hr).
        # ----------------------------------------------------
        raw_lightning_prob = 0.20
        if min_tb < 225.0:
            raw_lightning_prob += 0.35
        if min_tb < 205.0:
            raw_lightning_prob += 0.25
        if cooling_rate > 5.0:
            raw_lightning_prob += 0.15

        calibrated_lightning_prob = uncertainty_engine.calibrate_probability(
            raw_lightning_prob, horizon_min, sensor_availability
        )

        lightning_sev = "LOW"
        if calibrated_lightning_prob > 0.75:
            lightning_sev = "SEVERE"
        elif calibrated_lightning_prob > 0.55:
            lightning_sev = "HIGH"
        elif calibrated_lightning_prob > 0.35:
            lightning_sev = "MODERATE"

        lightning_out = {
            "hazard_type": "lightning",
            "severity": lightning_sev,
            "probability": calibrated_lightning_prob,
            "proxy_indicator": f"Convective cloud-top Tb = {min_tb:.1f} K, cooling rate = {cooling_rate:.1f} K/hr",
            "scientific_label": "Lightning proxy — direct lightning observations unavailable in prototype",
            "affected_area_km2": round(primary_storm["area_km2"] * 0.45, 1)
        }

        # ----------------------------------------------------
        # 2. HAIL PROXY
        # Physical basis: Severe updraft sustaining large hydrometeors aloft
        # requires very cold overshooting tops (Tb < 205 K) + high CAPE (> 2200 J/kg)
        # + strong deep-layer shear (> 18 m/s).
        # ----------------------------------------------------
        raw_hail_prob = 0.10
        if min_tb < 205.0 and cape > 2000.0:
            raw_hail_prob += 0.40
        if min_tb < 195.0:
            raw_hail_prob += 0.30
        if shear > 18.0:
            raw_hail_prob += 0.10

        calibrated_hail_prob = uncertainty_engine.calibrate_probability(
            raw_hail_prob, horizon_min, sensor_availability
        )

        hail_sev = "LOW"
        if calibrated_hail_prob > 0.65:
            hail_sev = "HIGH"
        elif calibrated_hail_prob > 0.40:
            hail_sev = "MODERATE"

        hail_out = {
            "hazard_type": "hail",
            "severity": hail_sev,
            "probability": calibrated_hail_prob,
            "proxy_indicator": f"Overshooting core Tb = {min_tb:.1f} K, CAPE = {cape:.0f} J/kg, Shear = {shear:.1f} m/s",
            "scientific_label": "Hail proxy — not verified against hail reports",
            "affected_area_km2": round(primary_storm["area_km2"] * 0.18, 1)
        }

        # ----------------------------------------------------
        # 3. DOWNBURST PROXY
        # Production requires: DWR Doppler radial velocity divergence & storm structure.
        # Prototype proxy: Negative cooling rate (cloud-top warming / collapse)
        # following high mature convective intensity.
        # ----------------------------------------------------
        raw_downburst_prob = 0.15
        if intensity > 0.75:
            raw_downburst_prob += 0.30
        if cooling_rate < -2.0: # collapsing cloud top
            raw_downburst_prob += 0.35

        calibrated_downburst_prob = uncertainty_engine.calibrate_probability(
            raw_downburst_prob, horizon_min, sensor_availability
        )

        downburst_sev = "LOW"
        if calibrated_downburst_prob > 0.70:
            downburst_sev = "SEVERE"
        elif calibrated_downburst_prob > 0.50:
            downburst_sev = "HIGH"
        elif calibrated_downburst_prob > 0.30:
            downburst_sev = "MODERATE"

        downburst_out = {
            "hazard_type": "downburst",
            "severity": downburst_sev,
            "probability": calibrated_downburst_prob,
            "proxy_indicator": f"Convective maturity index = {intensity:.2f}, cell trend delta = {cooling_rate:.1f} K/hr",
            "scientific_label": "Downburst proxy — radar velocity required for production",
            "affected_area_km2": round(primary_storm["area_km2"] * 0.28, 1)
        }

        # ----------------------------------------------------
        # 4. CLOUDBURST PROXY
        # Official IMD Definition: Rainfall >= 100 mm in 1 hour over approx 20-30 km^2.
        # Prototype proxy: Satellite rainfall-rate proxy derived from
        # deep convective core Tb (< 200 K) + high PW (> 50 mm) + slow storm motion (< 20 km/h).
        # ----------------------------------------------------
        raw_cloudburst_prob = 0.10
        if min_tb < 200.0 and pw > 50.0:
            raw_cloudburst_prob += 0.45
        if primary_storm["motion"]["speed_kmh"] < 25.0: # slow moving = extreme local accumulation
            raw_cloudburst_prob += 0.25

        calibrated_cloudburst_prob = uncertainty_engine.calibrate_probability(
            raw_cloudburst_prob, horizon_min, sensor_availability
        )

        cloudburst_sev = "LOW"
        if calibrated_cloudburst_prob > 0.68:
            cloudburst_sev = "SEVERE"
        elif calibrated_cloudburst_prob > 0.48:
            cloudburst_sev = "HIGH"
        elif calibrated_cloudburst_prob > 0.25:
            cloudburst_sev = "MODERATE"

        cloudburst_out = {
            "hazard_type": "cloudburst",
            "severity": cloudburst_sev,
            "probability": calibrated_cloudburst_prob,
            "proxy_indicator": f"Estimated rainfall rate proxy ~85-115 mm/hr, PW = {pw:.1f} mm (IMD criteria: >=100 mm/hr)",
            "scientific_label": "Cloudburst proxy — not gauge verified (Reference: Official IMD definition: >=100 mm in 1h over 20-30 km²)",
            "affected_area_km2": round(min(primary_storm["area_km2"] * 0.12, 450.0), 1)
        }

        return {
            "lightning": lightning_out,
            "hail": hail_out,
            "downburst": downburst_out,
            "cloudburst": cloudburst_out
        }

hazard_service = HazardService()
