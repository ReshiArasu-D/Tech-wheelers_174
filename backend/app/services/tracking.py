"""
Storm Cell Tracking & Lineage Service
Tracks storm cells across consecutive frames using centroid distance,
polygon IoU overlap, assigns persistent IDs, and detects Merge/Split transitions.
"""
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

class TrackingService:
    def __init__(self,
                 max_centroid_distance_km: float = 65.0,
                 min_iou_overlap: float = 0.08):
        self.max_centroid_distance_km = max_centroid_distance_km
        self.min_iou_overlap = min_iou_overlap
        self._next_id_counter = 1
        self._persistent_tracks: Dict[str, Dict[str, Any]] = {}
        self.lineage_records: List[Dict[str, Any]] = []

    def _calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Haversine distance in km between two lat/lon points."""
        r = 6371.0
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlam = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2.0)**2
        return float(2.0 * r * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0))))

    def _coords_to_polygon(self, coords: List[List[float]]) -> Optional[Polygon]:
        """Convert GeoJSON coordinates list to Shapely Polygon."""
        try:
            if len(coords) < 4:
                return None
            poly = Polygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            return poly if poly.is_valid and not poly.is_empty else None
        except Exception:
            return None

    def _compute_iou(self, poly1: Polygon, poly2: Polygon) -> float:
        """Compute Intersection over Union between two Shapely polygons."""
        try:
            inter = poly1.intersection(poly2).area
            union = poly1.union(poly2).area
            return float(inter / union) if union > 0 else 0.0
        except Exception:
            return 0.0

    def track_cells(self,
                    prev_cells: List[Dict[str, Any]],
                    curr_cells: List[Dict[str, Any]],
                    timestamp: str) -> List[Dict[str, Any]]:
        """
        Match storm cells between previous and current frames.
        Maintains persistent IDs and handles Continues, Merges, Splits, and New cells.
        """
        if not prev_cells:
            # First frame: initialize persistent IDs
            for i, cell in enumerate(curr_cells):
                pid = f"STORM-{(i + 1):03d}"
                cell["storm_id"] = pid
                cell["lineage_type"] = "INITIAL"
                cell["lineage_parents"] = []
                self._persistent_tracks[pid] = {
                    "last_centroid": cell["centroid"],
                    "last_seen": timestamp
                }
            self._next_id_counter = len(curr_cells) + 1
            return curr_cells

        # Build polygon objects for current and previous cells
        prev_polys = [self._coords_to_polygon(c["polygon_geojson"]["coordinates"][0]) for c in prev_cells]
        curr_polys = [self._coords_to_polygon(c["polygon_geojson"]["coordinates"][0]) for c in curr_cells]

        # Compute cost / affinity matrix: combined distance + IoU
        n_prev = len(prev_cells)
        n_curr = len(curr_cells)

        iou_matrix = np.zeros((n_prev, n_curr))
        dist_matrix = np.zeros((n_prev, n_curr))

        for p_idx, p_cell in enumerate(prev_cells):
            p_poly = prev_polys[p_idx]
            p_c = p_cell["centroid"]
            for c_idx, c_cell in enumerate(curr_cells):
                c_c = c_cell["centroid"]
                dist = self._calculate_haversine_distance(p_c["lat"], p_c["lon"], c_c["lat"], c_c["lon"])
                dist_matrix[p_idx, c_idx] = dist

                if p_poly and curr_polys[c_idx]:
                    iou_matrix[p_idx, c_idx] = self._compute_iou(p_poly, curr_polys[c_idx])

        # Track associations
        assigned_curr = set()
        assigned_prev = set()

        # Step 1: Direct IoU Overlap & Nearest Centroid (1-to-1 match = CONTINUE)
        for c_idx in range(n_curr):
            # Best previous match
            best_prev = None
            best_score = -1.0

            for p_idx in range(n_prev):
                iou = iou_matrix[p_idx, c_idx]
                dist = dist_matrix[p_idx, c_idx]

                # Match criteria: either significant IoU overlap or close centroid within 45 km
                if iou >= self.min_iou_overlap or dist <= self.max_centroid_distance_km:
                    score = iou * 100.0 + (100.0 - min(dist, 100.0))
                    if score > best_score:
                        best_score = score
                        best_prev = p_idx

            if best_prev is not None and best_score > 30.0:
                parent_id = prev_cells[best_prev]["storm_id"]
                curr_cells[c_idx]["storm_id"] = parent_id
                curr_cells[c_idx]["lineage_parents"] = [parent_id]
                curr_cells[c_idx]["lineage_type"] = "CONTINUE"
                assigned_curr.add(c_idx)
                assigned_prev.add(best_prev)

                self.lineage_records.append({
                    "timestamp": timestamp,
                    "parent_id": parent_id,
                    "child_id": parent_id,
                    "transition_type": "CONTINUE",
                    "overlap_iou": round(float(iou_matrix[best_prev, c_idx]), 3)
                })

        # Step 2: Check for MERGES (Multiple unassigned/assigned previous overlapping one current)
        for c_idx in range(n_curr):
            overlapping_parents = []
            for p_idx in range(n_prev):
                if iou_matrix[p_idx, c_idx] > 0.05 or dist_matrix[p_idx, c_idx] < 35.0:
                    overlapping_parents.append(prev_cells[p_idx]["storm_id"])

            if len(overlapping_parents) >= 2:
                # Merge detected!
                curr_cells[c_idx]["lineage_parents"] = overlapping_parents
                curr_cells[c_idx]["lineage_type"] = "MERGE"
                child_id = curr_cells[c_idx]["storm_id"]
                for pid in overlapping_parents:
                    self.lineage_records.append({
                        "timestamp": timestamp,
                        "parent_id": pid,
                        "child_id": child_id,
                        "transition_type": "MERGE",
                        "overlap_iou": round(float(iou_matrix[p_idx, c_idx]), 3)
                    })

        # Step 3: Check for SPLITS (One previous overlapping multiple current)
        for p_idx in range(n_prev):
            overlapping_children = [c_idx for c_idx in range(n_curr) if iou_matrix[p_idx, c_idx] > 0.04 or dist_matrix[p_idx, c_idx] < 30.0]
            if len(overlapping_children) >= 2:
                pid = prev_cells[p_idx]["storm_id"]
                for c_idx in overlapping_children:
                    if curr_cells[c_idx]["storm_id"] != pid:
                        curr_cells[c_idx]["lineage_parents"] = [pid]
                        curr_cells[c_idx]["lineage_type"] = "SPLIT"
                        self.lineage_records.append({
                            "timestamp": timestamp,
                            "parent_id": pid,
                            "child_id": curr_cells[c_idx]["storm_id"],
                            "transition_type": "SPLIT",
                            "overlap_iou": round(float(iou_matrix[p_idx, c_idx]), 3)
                        })

        # Step 4: Assign new persistent IDs to remaining unassigned cells (GENESIS)
        for c_idx in range(n_curr):
            if c_idx not in assigned_curr and curr_cells[c_idx]["storm_id"].startswith("STORM-"):
                # If still unassigned, generate fresh unique persistent ID
                new_id = f"STORM-{self._next_id_counter:03d}"
                self._next_id_counter += 1
                curr_cells[c_idx]["storm_id"] = new_id
                curr_cells[c_idx]["lineage_type"] = "GENESIS"
                curr_cells[c_idx]["lineage_parents"] = []

        return curr_cells

tracking_service = TrackingService()
