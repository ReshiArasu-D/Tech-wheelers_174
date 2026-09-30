"""
ERA5 U/V Wind Field ConvGRU model and inference service.
Architecture reconstructed from SIH 26084 training pipeline (Cell 981 in Colab).
Checkpoint: era5_uv_convgru.pt (43,378 parameters).
"""
import os
import logging
from typing import Dict, Any, Optional
import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class ConvGRUCell(nn.Module):
    def __init__(self, in_ch: int, hidden_ch: int):
        super().__init__()
        self.hidden_ch = hidden_ch
        self.conv = nn.Conv2d(
            in_ch + hidden_ch,
            hidden_ch * 3,
            kernel_size=3,
            padding=1
        )

    def forward(self, x: torch.Tensor, h: Optional[torch.Tensor] = None) -> torch.Tensor:
        if h is None:
            h = torch.zeros(
                x.size(0),
                self.hidden_ch,
                x.size(2),
                x.size(3),
                device=x.device,
                dtype=x.dtype
            )

        combined = torch.cat([x, h], dim=1)
        z, r, n = self.conv(combined).chunk(3, dim=1)
        z = torch.sigmoid(z)
        r = torch.sigmoid(r)
        n = torch.tanh(n + r * h)
        h = (1 - z) * n + z * h
        return h


class ERA5UVConvGRU(nn.Module):
    """
    Spatiotemporal ConvGRU nowcaster for ERA5 horizontal wind components (U, V).
    Input: [B, T, 2, H, W] (e.g. sequence of 2-channel U/V wind grids)
    Output: [B, 2, H, W] (next-step forecasted U, V wind vector fields)
    Parameters: 43,378
    """
    def __init__(self):
        super().__init__()
        self.gru = ConvGRUCell(2, 32)
        self.encoder = nn.Sequential(
            nn.Conv2d(32, 32, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 16, 3, padding=1),
            nn.ReLU()
        )
        self.head = nn.Conv2d(16, 2, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, 2, H, W]
        h = None
        for t in range(x.size(1)):
            h = self.gru(x[:, t], h)
        h = self.encoder(h)
        return self.head(h)


class ERA5UVService:
    def __init__(self, checkpoint_path: Optional[str] = None):
        self.device = torch.device("cpu")
        self.model = ERA5UVConvGRU().to(self.device)
        self.is_loaded = False
        self.checkpoint_metadata: Dict[str, Any] = {}
        self.u_mean = 0.0
        self.u_std = 1.0
        self.v_mean = 0.0
        self.v_std = 1.0
        self.load_checkpoint(checkpoint_path)

    def load_checkpoint(self, path: Optional[str] = None) -> bool:
        candidate_paths = [
            path,
            os.path.join("backend", "models", "era5", "era5_uv_convgru.pt"),
            os.path.join("backend", "models", "era5_uv_convgru.pt"),
            r"D:\era5_uv_convgru.pt"
        ]
        target_path = next((p for p in candidate_paths if p and os.path.isfile(p)), None)
        if not target_path:
            logger.warning("[ERA5UVService] Checkpoint era5_uv_convgru.pt not found.")
            return False

        try:
            ckpt = torch.load(target_path, map_location=self.device, weights_only=False)
            state_dict = ckpt.get("model_state_dict", ckpt)
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self.is_loaded = True
            self.u_mean = float(ckpt.get("u_mean", 0.0))
            self.u_std = float(ckpt.get("u_std", 1.0))
            self.v_mean = float(ckpt.get("v_mean", 0.0))
            self.v_std = float(ckpt.get("v_std", 1.0))
            self.checkpoint_metadata = {
                "checkpoint_path": target_path,
                "parameters": sum(p.numel() for p in self.model.parameters()),
                "u_variable": ckpt.get("u_variable", "u10"),
                "v_variable": ckpt.get("v_variable", "v10"),
                "spatial_size": ckpt.get("spatial_size", [32, 32]),
            }
            logger.info(f"[ERA5UVService] Loaded {target_path} ({self.checkpoint_metadata['parameters']:,} params)")
            return True
        except Exception as e:
            logger.error(f"[ERA5UVService] Failed to load checkpoint {target_path}: {e}")
            self.is_loaded = False
            return False

    def predict_wind_field(self, uv_sequence: np.ndarray) -> np.ndarray:
        """
        Predict next-step horizontal wind field [U, V].
        uv_sequence: [T, 2, H, W] or [B, T, 2, H, W]
        Returns predicted [U, V] grid: [2, H, W]
        """
        if not self.is_loaded:
            return np.zeros((2, 32, 32), dtype=np.float32)

        arr = np.asarray(uv_sequence, dtype=np.float32)
        if arr.ndim == 4:
            arr = np.expand_dims(arr, 0)  # [1, T, 2, H, W]

        # Normalize
        arr[:, :, 0] = (arr[:, :, 0] - self.u_mean) / (self.u_std + 1e-7)
        arr[:, :, 1] = (arr[:, :, 1] - self.v_mean) / (self.v_std + 1e-7)

        with torch.no_grad():
            inp_t = torch.from_numpy(arr).to(self.device)
            out_t = self.model(inp_t)
            out_np = out_t.cpu().numpy()[0]

        # Denormalize
        out_np[0] = out_np[0] * self.u_std + self.u_mean
        out_np[1] = out_np[1] * self.v_std + self.v_mean
        return out_np


era5_uv_service = ERA5UVService()
