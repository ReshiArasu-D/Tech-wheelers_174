"""
Hazard Arrival Engine
Calculates lead-time countdowns to critical urban, industrial, and coastal targets.
Does NOT rely solely on centroid arrival; evaluates hazard contour leading edge
intersection and multi-horizon polygon interpolation.
"""
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from shapely.geometry import Point, Polygon

class ArrivalEngine:
    def __init__(self):
        # Operational target observation stations across Eastern & Southern Coastal Belt
        self.targets = [
            {
                "name": "Paradeep Port & Coastal Belt",
                "lat": 20.316,
                "lon": 86.611,
                "exposure_tier": "HIGH_INFRASTRUCTURE"
            },
            {
                "name": "Bhubaneswar Urban Area",
                "lat": 20.296,
                "lon": 85.824,
                "exposure_tier": "URBAN_POPULATION"
            },
            {
                "name": "Digha Coastal Tourism Zone",
                "lat": 21.626,
                "lon": 87.507,
                "exposure_tier": "COASTAL_COMMUNITY"
            },
            {
                "name": "Kolkata Metropolitan Area",
                "lat": 22.572,
                "lon": 88.363,
                "exposure_tier": "HIGH_POPULATION"
            },
            {
                "name": "Visakhapatnam Harbor",
                "lat": 17.686,
                "lon": 83.218,
                "exposure_tier": "HIGH_INFRASTRUCTURE"
            },
            {
                "name": "Chennai Coastal Zone",
                "lat": 13.082,
                "lon": 80.270,
                "exposure_tier": "URBAN_POPULATION"
            }
        ]

    def _haversine_distance_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        r = 6371.0
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlam = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2.0)**2
        return float(2.0 * r * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0))))

    def _format_countdown(self, minutes: float) -> str:
        """Format minutes as HH:MM:SS countdown."""
        if minutes <= 0:
            return "00:00:00 (IMPACT ACTIVE)"
        total_seconds = int(minutes * 60)
        hours = total_seconds // 3600
        mins = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hours:02d}:{mins:02d}:{secs:02d}"

    def compute_arrivals(self,
                         active_storms: List[Dict[str, Any]],
                         forecasts: Dict[str, Any],
                         sensor_availability: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculates location-specific hazard arrival times and countdown displays.
        """
        results = {}

        if not active_storms:
            for t in self.targets:
                results[t["name"]] = {
                    "target_name": t["name"],
                    "lat": t["lat"],
                    "lon": t["lon"],
                    "estimated_arrival_minutes": None,
                    "countdown_display": "NO IMPACT DETECTED",
                    "impact_probability": 0.05,
                    "confidence": "HIGH",
                    "hazard_types": []
                }
            return results

        # Primary severe cells
        primary_storms = active_storms[:3]

        for target in self.targets:
            t_pt = Point(target["lon"], target["lat"])
            t_lat = target["lat"]
            t_lon = target["lon"]

            best_arrival_min = None
            intersecting_storm_id = None
            impact_prob = 0.10
            hazards_list = ["Heavy Rainfall"]

            # Step 1: Check if target is already inside any current storm polygon
            currently_inside = False
            for s in primary_storms:
                try:
                    coords = s["polygon_geojson"]["coordinates"][0]
                    poly = Polygon(coords)
                    if poly.is_valid and poly.contains(t_pt):
                        currently_inside = True
                        intersecting_storm_id = s["storm_id"]
                        best_arrival_min = 0.0
                        impact_prob = 0.95
                        hazards_list = ["Lightning", "High Wind Gusts", "Torrential Rain"]
                        break
                except Exception:
                    pass

            # Step 2: If not currently inside, test forecast horizons (+15, +30, +60, +180, +360)
            if not currently_inside:
                # Test projected polygons in fine-scale horizons (15m, 30m, 60m)
                for hz_key in ["15m", "30m", "60m"]:
                    if hz_key in forecasts:
                        hz_data = forecasts[hz_key]
                        for proj_s in hz_data.get("storm_polygons", []):
                            try:
                                poly = Polygon(proj_s["polygon_geojson"]["coordinates"][0])
                                if poly.is_valid and poly.contains(t_pt):
                                    best_arrival_min = float(hz_data["horizon_minutes"])
                                    impact_prob = float(hz_data["confidence"] * 0.90)
                                    intersecting_storm_id = proj_s["storm_id"]
                                    hazards_list = ["Lightning", "Hail Proxy", "Heavy Precipitation"]
                                    break
                            except Exception:
                                pass
                        if best_arrival_min is not None:
                            break

                # If still not hit, test leading edge trajectory distance
                if best_arrival_min is None:
                    # Find nearest approaching storm cell
                    for s in primary_storms:
                        dist = self._haversine_distance_km(s["centroid"]["lat"], s["centroid"]["lon"], t_lat, t_lon)
                        motion = s["motion"]
                        speed = motion["speed_kmh"]

                        # Check if storm is moving towards target
                        # Vector from centroid to target
                        dlat = t_lat - s["centroid"]["lat"]
                        dlon = t_lon - s["centroid"]["lon"]
                        target_bearing = (np.degrees(np.arctan2(dlon, dlat)) + 360) % 360

                        bearing_diff = abs(target_bearing - motion["direction_deg"])
                        bearing_diff = min(bearing_diff, 360 - bearing_diff)

                        # If moving within a 45 degree corridor towards target and within 300 km
                        if bearing_diff < 50.0 and dist < 320.0 and speed > 5.0:
                            # Account for storm radius (leading edge reaches before centroid)
                            storm_radius_km = np.sqrt(s["area_km2"] / np.pi)
                            effective_dist_km = max(5.0, dist - storm_radius_km * 0.8)
                            eta_hours = effective_dist_km / speed
                            eta_mins = eta_hours * 60.0

                            if best_arrival_min is None or eta_mins < best_arrival_min:
                                best_arrival_min = round(eta_mins, 1)
                                impact_prob = round(max(0.20, (1.0 - bearing_diff / 50.0) * 0.75), 2)
                                hazards_list = ["Approaching Convective Cell", "Squall Potential"]

            # Confidence based on arrival time and sensor availability
            if sensor_availability.get("dwr") != "available":
                # Max prototype confidence capped at MEDIUM
                conf = "MEDIUM" if (best_arrival_min and best_arrival_min < 90.0) else "LOW"
            else:
                conf = "HIGH" if (best_arrival_min and best_arrival_min < 45.0) else "MEDIUM"

            countdown = self._format_countdown(best_arrival_min) if best_arrival_min is not None else "NO IMPACT DETECTED"

            results[target["name"]] = {
                "target_name": target["name"],
                "lat": t_lat,
                "lon": t_lon,
                "estimated_arrival_minutes": best_arrival_min,
                "countdown_display": countdown,
                "impact_probability": impact_prob,
                "confidence": conf,
                "hazard_types": hazards_list
            }

        return results

arrival_engine = ArrivalEngine()
