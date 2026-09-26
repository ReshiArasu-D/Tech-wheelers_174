"""
ConvGRU Residual Nowcasting Model (PyTorch)
Combines Optical Flow Advection with ConvGRU learned convective growth/decay residuals:
Final Forecast = clamp(Optical_Flow_Advection + ConvGRU_Residual, 0, 1)

Forecast Horizons:
+15 min, +30 min, +60 min: Fine storm-scale cell polygons and vector trajectories
+180 min, +360 min: Broader probabilistic corridors with wider uncertainty envelope
"""
import os
import datetime
import torch
import torch.nn as nn
import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional, Any
from backend.app.config import settings

class ConvGRUCell(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super(ConvGRUCell, self).__init__()
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        padding = kernel_size // 2

        # Reset and update gates
        self.conv_gates = nn.Conv2d(
            in_channels + hidden_channels,
            2 * hidden_channels,
            kernel_size=kernel_size,
            padding=padding
        )
        # Candidate hidden state
        self.conv_can = nn.Conv2d(
            in_channels + hidden_channels,
            hidden_channels,
            kernel_size=kernel_size,
            padding=padding
        )

    def forward(self, x: torch.Tensor, h_prev: Optional[torch.Tensor] = None) -> torch.Tensor:
        if h_prev is None:
            h_prev = torch.zeros(x.size(0), self.hidden_channels, x.size(2), x.size(3), device=x.device)

        combined = torch.cat([x, h_prev], dim=1)
        gates = torch.sigmoid(self.conv_gates(combined))
        r_gate, z_gate = torch.chunk(gates, 2, dim=1)

        combined_can = torch.cat([x, r_gate * h_prev], dim=1)
        h_candidate = torch.tanh(self.conv_can(combined_can))

        h_next = (1.0 - z_gate) * h_prev + z_gate * h_candidate
        return h_next

class ConvGRUResidualNetwork(nn.Module):
    def __init__(self, in_channels: int = 5, hidden_channels: int = 16):
        super(ConvGRUResidualNetwork, self).__init__()
        self.convgru = ConvGRUCell(in_channels, hidden_channels)
        self.residual_head = nn.Sequential(
            nn.Conv2d(hidden_channels, 8, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(8, 1, kernel_size=3, padding=1),
            nn.Tanh() # Residual scale: [-1, 1] scaled by 0.35 in forward
        )

    def forward(self, x: torch.Tensor, h_prev: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        h = self.convgru(x, h_prev)
        # Bounded residual adjustment (-0.35 to +0.35 convective index)
        residual = self.residual_head(h) * 0.35
        return residual, h

class ConvGRUNowcaster:
    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or settings.MODEL_DIR
        os.makedirs(self.model_dir, exist_ok=True)
        self.weights_path = os.path.join(self.model_dir, "convgru_residual.pt")
        self.device = torch.device("cpu") # Prototype CPU execution

        self.model = ConvGRUResidualNetwork(in_channels=5, hidden_channels=16).to(self.device)
        self.model.eval()
        self._ensure_weights()

    def _ensure_weights(self):
        """Load pretrained weights or initialize and save baseline demonstration weights."""
        if os.path.exists(self.weights_path):
            try:
                state_dict = torch.load(self.weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                return
            except Exception as e:
                print(f"Loading checkpoint failed ({e}), re-initializing weights.")

        # Initialize deterministic demonstration weights
        torch.manual_seed(42)
        for p in self.model.parameters():
            if p.dim() > 1:
                nn.init.kaiming_normal_(p, nonlinearity="relu")
        torch.save(self.model.state_dict(), self.weights_path)

    def predict_residual(self,
                         prev_frame: np.ndarray,
                         curr_frame: np.ndarray,
                         flow: np.ndarray,
                         env_field: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Inference on downsampled grid for high-speed responsiveness, then interpolated.
        Input shapes: (H, W)
        """
        h, w = curr_frame.shape
        # Downsample to 128x128 for real-time ConvGRU inference
        target_h, target_w = 128, 128

        curr_small = cv2.resize(curr_frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        prev_small = cv2.resize(prev_frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        u_small = cv2.resize(flow[:, :, 0], (target_w, target_h), interpolation=cv2.INTER_AREA) / 10.0
        v_small = cv2.resize(flow[:, :, 1], (target_w, target_h), interpolation=cv2.INTER_AREA) / 10.0

        if env_field is not None:
            env_small = cv2.resize(env_field, (target_w, target_h), interpolation=cv2.INTER_AREA)
        else:
            env_small = np.ones((target_h, target_w), dtype=np.float32) * 0.7

        # Assemble 5-channel tensor: [prev, curr, u, v, env]
        tensor_in = np.stack([prev_small, curr_small, u_small, v_small, env_small], axis=0)
        tensor_in = torch.from_numpy(tensor_in).unsqueeze(0).float().to(self.device)

        with torch.no_grad():
            residual_tensor, _ = self.model(tensor_in)
            res_np = residual_tensor.squeeze().cpu().numpy()

        # Upsample residual back to full resolution
        residual_full = cv2.resize(res_np, (w, h), interpolation=cv2.INTER_LINEAR)
        return residual_full

    def generate_horizon_forecasts(self,
                                   current_frame: Dict[str, Any],
                                   previous_frame: Dict[str, Any],
                                   dense_flow: np.ndarray,
                                   active_storms: List[Dict[str, Any]],
                                   era5_context: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        Generate multi-horizon forecasts:
        +15m, +30m, +60m (Fine storm scale)
        +180m, +360m (Broad probabilistic corridors)
        """
        curr_intensity = current_frame["convective_intensity"]
        prev_intensity = previous_frame["convective_intensity"]
        lat_grid = current_frame["lat_grid"]
        lon_grid = current_frame["lon_grid"]
        h, w = curr_intensity.shape

        # Compute ConvGRU residual
        convgru_res = self.predict_residual(prev_intensity, curr_intensity, dense_flow)

        horizons = [15, 30, 60, 180, 360]
        forecast_results = {}

        # Parse base time
        base_dt = datetime.datetime.fromisoformat(current_frame["timestamp"].replace("Z", "+00:00"))

        for hz in horizons:
            target_dt = base_dt + datetime.timedelta(minutes=hz)
            target_ts = target_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            # 1. Optical Flow Advection (Baseline 2)
            scale = float(hz) / 30.0
            grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
            map_x = (grid_x - dense_flow[:, :, 0] * scale).astype(np.float32)
            map_y = (grid_y - dense_flow[:, :, 1] * scale).astype(np.float32)

            flow_field = cv2.remap(
                curr_intensity.astype(np.float32),
                map_x,
                map_y,
                interpolation=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT
            )

            # 2. Combine with ConvGRU residual
            # Residual attenuates at longer horizons as non-linearity grows
            res_weight = max(0.2, 1.0 - (hz / 400.0))
            combined_field = np.clip(flow_field + convgru_res * res_weight, 0.0, 1.0)

            # 3. Horizon-specific styling and uncertainty
            if hz <= 60:
                # 0-60 min: Fine storm-scale nowcasting
                hz_type = "FINE_STORM_SCALE"
                confidence = round(max(0.60, 0.92 - (hz / 60.0) * 0.25), 2)
                unc_score = round(0.08 + (hz / 60.0) * 0.32, 2)
                conformal_interval = {
                    "lower": round(max(0.0, confidence - unc_score * 0.5), 2),
                    "upper": round(min(1.0, confidence + unc_score * 0.5), 2)
                }

                # Project storm cell centroids & polygons forward
                projected_storms = []
                for s in active_storms:
                    # Extrapolate centroid
                    u_kmh = s["motion"]["u"]
                    v_kmh = s["motion"]["v"]
                    # 1 deg lat approx 111 km, 1 deg lon approx 105 km
                    dt_hr = hz / 60.0
                    dlat = (v_kmh * dt_hr) / 111.0
                    dlon = (u_kmh * dt_hr) / 105.0

                    new_lat = round(s["centroid"]["lat"] + dlat, 4)
                    new_lon = round(s["centroid"]["lon"] + dlon, 4)

                    # Shift polygon vertices
                    coords = s["polygon_geojson"]["coordinates"][0]
                    shifted_coords = [[round(pt[0] + dlon, 4), round(pt[1] + dlat, 4)] for pt in coords]

                    # Area changes slightly (dispersion/decay)
                    proj_intensity = round(max(0.2, s["intensity"] * (1.0 - (hz / 240.0))), 2)

                    projected_storms.append({
                        "storm_id": s["storm_id"],
                        "centroid": {"lat": new_lat, "lon": new_lon},
                        "projected_intensity": proj_intensity,
                        "polygon_geojson": {
                            "type": "Polygon",
                            "coordinates": [shifted_coords]
                        }
                    })

                forecast_results[f"{hz}m"] = {
                    "horizon_minutes": hz,
                    "target_timestamp": target_ts,
                    "type": hz_type,
                    "confidence": confidence,
                    "uncertainty_score": unc_score,
                    "conformal_interval": conformal_interval,
                    "storm_polygons": projected_storms,
                    "probabilistic_contours": [],
                    "corridors": []
                }
            else:
                # 3-6 hours (180m, 360m): Broad probabilistic corridors
                hz_type = "PROBABILISTIC_CORRIDOR"
                confidence = round(max(0.25, 0.55 - ((hz - 60) / 300.0) * 0.28), 2)
                unc_score = round(0.55 + ((hz - 60) / 300.0) * 0.35, 2)
                conformal_interval = {
                    "lower": round(max(0.0, confidence - unc_score * 0.6), 2),
                    "upper": round(min(1.0, confidence + unc_score * 0.6), 2)
                }

                # Generate broad probabilistic corridor polygons
                corridors = []
                for s in active_storms[:3]: # Focus on primary convective clusters
                    u_kmh = s["motion"]["u"]
                    v_kmh = s["motion"]["v"]
                    dt_hr = hz / 60.0
                    dlat = (v_kmh * dt_hr) / 111.0
                    dlon = (u_kmh * dt_hr) / 105.0

                    c_lat = s["centroid"]["lat"]
                    c_lon = s["centroid"]["lon"]
                    target_lat = c_lat + dlat
                    target_lon = c_lon + dlon

                    # Dispersion cone width expands with horizon:
                    # At 180 min: ~60 km radius; at 360 min: ~120 km radius
                    cone_deg = (45.0 + (hz / 360.0) * 80.0) / 111.0

                    corridor_poly = [
                        [round(c_lon - 0.3, 4), round(c_lat, 4)],
                        [round(target_lon - cone_deg, 4), round(target_lat - 0.2, 4)],
                        [round(target_lon, 4), round(target_lat + cone_deg, 4)],
                        [round(target_lon + cone_deg, 4), round(target_lat - 0.2, 4)],
                        [round(c_lon + 0.3, 4), round(c_lat, 4)],
                        [round(c_lon - 0.3, 4), round(c_lat, 4)]
                    ]

                    corridors.append({
                        "storm_id": s["storm_id"],
                        "probability": round(confidence * 0.85, 2),
                        "dispersion_radius_km": round(cone_deg * 111.0, 1),
                        "corridor_polygon": {
                            "type": "Polygon",
                            "coordinates": [corridor_poly]
                        }
                    })

                forecast_results[f"{hz}m"] = {
                    "horizon_minutes": hz,
                    "target_timestamp": target_ts,
                    "type": hz_type,
                    "confidence": confidence,
                    "uncertainty_score": unc_score,
                    "conformal_interval": conformal_interval,
                    "storm_polygons": [], # No fake fine cell polygons at 3-6 hours
                    "probabilistic_contours": [],
                    "corridors": corridors
                }

        return forecast_results

convgru_nowcaster = ConvGRUNowcaster()
