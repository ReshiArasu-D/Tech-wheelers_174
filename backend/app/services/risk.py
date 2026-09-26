"""
Risk Assessment Engine
Combines:
  - Multi-hazard probabilities and severities
  - Calibration uncertainty
  - Projected arrival time
  - Static population density exposure layer
  - Critical infrastructure exposure (Ports, Power grids, Coastal transport corridors)
  - Storm cell persistence
Produces:
  - Calibrated Risk Score (0 to 100)
  - Risk Level (LOW, MODERATE, HIGH, SEVERE)
"""
from typing import Dict, List, Tuple, Optional, Any
import numpy as np

class RiskEngine:
    def __init__(self):
        # Static regional exposure indexes (Scale: 1.0 to 3.0)
        # Reflects census / urban population density & critical infrastructure hubs
        self.regional_exposure_map = {
            "Kolkata Metropolitan Belt": 2.85,
            "Howrah Industrial Belt": 2.60,
            "Paradeep Deepwater Port & Petrochem Hub": 2.40,
            "Bhubaneswar-Cuttack Urban Corridor": 2.25,
            "Visakhapatnam Naval & Industrial Corridor": 2.30,
            "Chennai Coastal Urban Zone": 2.80,
            "Digha & Coastal Tourism Zone": 1.75,
            "Open Ocean (Bay of Bengal Shipping Lanes)": 1.10
        }

    def compute_risk(self,
                     hazards: Dict[str, Any],
                     active_storms: List[Dict[str, Any]],
                     arrival_info: Dict[str, Any],
                     sensor_availability: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculates composite risk score (0 to 100).
        """
        if not active_storms:
            return {
                "overall_risk_score": 12.0,
                "risk_level": "LOW",
                "population_exposure_index": 1.0,
                "critical_infrastructure_risk": "MINIMAL",
                "persistence_factor": 0.2,
                "primary_threat": "None detected"
            }

        primary_storm = active_storms[0]

        # 1. Hazard Severity Component (0 to 40 pts)
        sev_weights = {"SEVERE": 40.0, "HIGH": 28.0, "MODERATE": 16.0, "LOW": 8.0, "NONE": 0.0}
        max_haz_score = 0.0
        primary_threat = "Convective Thunderstorm"

        for h_key, h_data in hazards.items():
            prob = h_data.get("probability", 0.1)
            sev = h_data.get("severity", "LOW")
            score = sev_weights.get(sev, 10.0) * prob
            if score > max_haz_score:
                max_haz_score = score
                primary_threat = f"{h_key.capitalize()} ({sev})"

        haz_component = min(max_haz_score, 40.0)

        # 2. Exposure Component (0 to 25 pts)
        # Check nearest target in arrival_info
        highest_exposure = 1.4
        crit_infra = "MODERATE"

        for target_name, arr in arrival_info.items():
            if arr.get("estimated_arrival_minutes") is not None and arr["estimated_arrival_minutes"] < 120.0:
                exp = self.regional_exposure_map.get(target_name, 1.8)
                if exp > highest_exposure:
                    highest_exposure = exp
                    crit_infra = "ELEVATED" if exp < 2.5 else "CRITICAL"

        exposure_component = (highest_exposure / 3.0) * 25.0

        # 3. Urgency / Arrival Time Component (0 to 20 pts)
        # Closer arrival = higher immediate operational risk
        min_eta = 999.0
        for arr in arrival_info.values():
            eta = arr.get("estimated_arrival_minutes")
            if eta is not None and eta < min_eta:
                min_eta = eta

        if min_eta <= 30.0:
            urgency_component = 20.0
        elif min_eta <= 60.0:
            urgency_component = 16.0
        elif min_eta <= 120.0:
            urgency_component = 11.0
        elif min_eta <= 240.0:
            urgency_component = 6.0
        else:
            urgency_component = 3.0

        # 4. Persistence & Cell Scale Factor (0 to 15 pts)
        area = primary_storm["area_km2"]
        intensity = primary_storm["intensity"]
        persistence_component = min(15.0, (area / 15000.0) * 8.0 + intensity * 7.0)

        # Composite Risk Score
        raw_score = haz_component + exposure_component + urgency_component + persistence_component

        # Adjust slightly if sensors are degraded
        if sensor_availability.get("dwr") != "available":
            # Add precautionary margin under degraded observational confidence
            raw_score = min(100.0, raw_score * 1.05)

        risk_score = round(float(np.clip(raw_score, 5.0, 98.0)), 1)

        if risk_score >= 75.0:
            level = "SEVERE"
        elif risk_score >= 50.0:
            level = "HIGH"
        elif risk_score >= 30.0:
            level = "MODERATE"
        else:
            level = "LOW"

        return {
            "overall_risk_score": risk_score,
            "risk_level": level,
            "population_exposure_index": round(highest_exposure, 2),
            "critical_infrastructure_risk": crit_infra,
            "persistence_factor": round(float(persistence_component / 15.0), 2),
            "primary_threat": primary_threat
        }

risk_engine = RiskEngine()
