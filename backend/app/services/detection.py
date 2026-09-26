"""
Convective Initiation (CI) & Storm Cell Detection Service
Implements:
1. Convective Initiation Score (INSAT Tb + Cooling Rate + ERA5 Instability)
2. Storm Cell Detection (Thresholding, Morphological Cleanup, Connected Components, Polygon Extraction)
"""
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import cv2
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union

class DetectionService:
    def __init__(self,
                 tb_threshold_k: float = 235.0,
                 severe_tb_k: float = 215.0,
                 min_area_km2: float = 150.0,
                 pixel_area_km2: float = 13.7):
        self.tb_threshold_k = tb_threshold_k
        self.severe_tb_k = severe_tb_k
        self.min_area_km2 = min_area_km2
        self.pixel_area_km2 = pixel_area_km2

    def compute_convective_initiation(self,
                                      current_frame: Dict[str, Any],
                                      previous_frame: Optional[Dict[str, Any]] = None,
                                      era5_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Convective Initiation (CI) computation:
        - Cold cloud top signal: Colder cloud tops (Tb < 240K) have higher base score
        - Rapid cooling rate: dTb/dt < 0 indicates vertical updraft and cloud growth
        - ERA5 instability: High CAPE (> 2000 J/kg) and Precipitable Water (> 50 mm)
        """
        tb_curr = current_frame["tb_kelvin"]
        h, w = tb_curr.shape

        # 1. Cold cloud-top term [0, 1]
        cold_cloud_term = np.clip((260.0 - tb_curr) / (260.0 - 200.0), 0.0, 1.0)

        # 2. Cooling rate term (K / hr)
        if previous_frame is not None:
            tb_prev = previous_frame["tb_kelvin"]
            # Assume 30 min frame interval = 0.5 hr
            dt_hours = 0.5
            cooling_rate = (tb_prev - tb_curr) / dt_hours # positive when cooling
            cooling_term = np.clip(cooling_rate / 15.0, 0.0, 1.0) # 15 K/hr rapid cooling = 1.0
        else:
            cooling_rate = np.zeros_like(tb_curr)
            cooling_term = np.zeros_like(tb_curr)

        # 3. Environmental instability term from ERA5
        era5_weight = 0.8
        if era5_context and "parameters" in era5_context:
            params = era5_context["parameters"]
            cape = params.get("cape_j_kg", {}).get("mean", 2000.0)
            pw = params.get("precipitable_water_mm", {}).get("mean", 50.0)
            cape_norm = np.clip(cape / 3500.0, 0.0, 1.0)
            pw_norm = np.clip(pw / 65.0, 0.0, 1.0)
            env_term = 0.6 * cape_norm + 0.4 * pw_norm
        else:
            env_term = 0.7

        # Composite CI Score [0.0, 1.0]
        # Weighting: 40% Cold Cloud Top + 35% Cooling Rate + 25% Environmental Instability
        ci_map = 0.40 * cold_cloud_term + 0.35 * cooling_term + 0.25 * env_term
        ci_map = np.clip(ci_map, 0.0, 1.0).astype(np.float32)

        return {
            "ci_map": ci_map,
            "cooling_rate_k_hr": cooling_rate,
            "label": "Prototype CI = reduced-feature INSAT + ERA5 (direct radar growth & lightning unavailable)",
            "mean_ci_score": float(np.mean(ci_map[cold_cloud_term > 0.2])) if np.any(cold_cloud_term > 0.2) else 0.0,
            "active_ci_fraction": float(np.mean(ci_map > 0.65))
        }

    def detect_storm_cells(self,
                           current_frame: Dict[str, Any],
                           ci_result: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Detect discrete convective storm cells:
        1. Binary threshold on Tb (Tb < 235 K)
        2. Morphological cleanup (open to remove noise, close to bridge core gaps)
        3. Connected components & contour polygon extraction
        4. Area and centroid calculation
        """
        tb = current_frame["tb_kelvin"]
        lat_grid = current_frame["lat_grid"]
        lon_grid = current_frame["lon_grid"]
        timestamp = current_frame["timestamp"]

        # Binary convective mask: 1 where Tb < threshold
        binary_mask = (tb < self.tb_threshold_k).astype(np.uint8)

        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        clean_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Find external contours
        contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        storm_cells = []
        cell_counter = 1

        for cnt in contours:
            pixel_count = cv2.contourArea(cnt)
            area_km2 = pixel_count * self.pixel_area_km2

            if area_km2 < self.min_area_km2:
                continue

            # Approximate contour polygon to reduce payload size while preserving boundary fidelity
            epsilon = 0.015 * cv2.arcLength(cnt, True)
            approx_cnt = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx_cnt) < 3:
                continue

            # Convert pixel coordinates to (lon, lat) GeoJSON coordinates
            coords = []
            for pt in approx_cnt:
                px, py = pt[0][0], pt[0][1]
                # Clamp within grid bounds
                py = min(max(py, 0), lat_grid.shape[0] - 1)
                px = min(max(px, 0), lon_grid.shape[1] - 1)
                pt_lat = float(lat_grid[py, px])
                pt_lon = float(lon_grid[py, px])
                coords.append([round(pt_lon, 4), round(pt_lat, 4)])

            # Ensure polygon ring is closed
            if coords[0] != coords[-1]:
                coords.append(coords[0])

            # Calculate centroid
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                c_px = int(M["m10"] / M["m00"])
                c_py = int(M["m01"] / M["m00"])
                c_px = min(max(c_px, 0), lon_grid.shape[1] - 1)
                c_py = min(max(c_py, 0), lat_grid.shape[0] - 1)
                centroid_lat = float(lat_grid[c_py, c_px])
                centroid_lon = float(lon_grid[c_py, c_px])
            else:
                centroid_lat = float(np.mean([c[1] for c in coords]))
                centroid_lon = float(np.mean([c[0] for c in coords]))

            # Extract cell intensity and temperature stats
            cell_mask = np.zeros_like(clean_mask)
            cv2.drawContours(cell_mask, [cnt], -1, 1, thickness=-1)
            cell_tb = tb[cell_mask == 1]

            min_tb = float(np.min(cell_tb)) if len(cell_tb) > 0 else float(self.tb_threshold_k)
            mean_tb = float(np.mean(cell_tb)) if len(cell_tb) > 0 else float(self.tb_threshold_k)

            # Intensity score: 0 to 1
            intensity = float(np.clip((240.0 - min_tb) / (240.0 - 190.0), 0.1, 1.0))

            # Cooling rate if CI result present
            cooling_val = 0.0
            if ci_result and "cooling_rate_k_hr" in ci_result:
                cr_arr = ci_result["cooling_rate_k_hr"][cell_mask == 1]
                cooling_val = float(np.mean(cr_arr)) if len(cr_arr) > 0 else 0.0

            storm_id = f"STORM-{cell_counter:03d}"
            cell_counter += 1

            storm_cells.append({
                "storm_id": storm_id,
                "timestamp": timestamp,
                "centroid": {
                    "lat": round(centroid_lat, 4),
                    "lon": round(centroid_lon, 4)
                },
                "area_km2": round(area_km2, 1),
                "intensity": round(intensity, 3),
                "min_tb_k": round(min_tb, 1),
                "mean_tb_k": round(mean_tb, 1),
                "cooling_rate_k_hr": round(cooling_val, 1),
                "polygon_geojson": {
                    "type": "Polygon",
                    "coordinates": [coords]
                },
                "motion": {
                    "u": 0.0,
                    "v": 0.0,
                    "speed_kmh": 0.0,
                    "direction_deg": 0.0
                },
                "lineage_parents": [],
                "lineage_type": "CONTINUE"
            })

        # Sort cells descending by area/intensity
        storm_cells.sort(key=lambda s: s["area_km2"], reverse=True)
        # Re-index storm IDs in descending importance order
        for idx, storm in enumerate(storm_cells):
            storm["storm_id"] = f"STORM-{(idx + 1):03d}"

        return storm_cells

detection_service = DetectionService()
