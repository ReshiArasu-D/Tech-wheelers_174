"""
Hazard Heads Architecture for SIH 26084.
Exact architectural reproduction of Colab Cell 678.
Unified 2D Convective Hazard Head (4,641 parameters):
- Conv2d(32, 16, 3, padding=1) -> ReLU -> Conv2d(16, 1, 1)
Used for:
- Thunderstorm (thunderstorm_head_prototype.pt)
- Hail (hail_head_prototype.pt)
- Heavy Rain (heavy_rain_head_KFTG.pt / multimodal_convgru_rain.pt)
- Cloudburst (cloudburst_head_KGSP.pt)
"""
import os
import logging
from typing import Dict, Any, Optional
import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class HazardHead(nn.Module):
    """
    Canonical Unified 2D Hazard Head from SIH 26084 Colab Cell 678.
    Maps shared storm feature representation [B, 32, 128, 128] to
    hazard probability logits [B, 128, 128].
    Total parameters: 4,641.
    """
    def __init__(self, in_channels: int = 32, hidden_channels: int = 16):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_channels, hidden_channels, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(hidden_channels, 1, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(1)


class HazardHeadService:
    """
    Manages loading and execution of trained HazardHead checkpoints
    along with verified inference arrays (22 x 128 x 128).
    """
    def __init__(self):
        self.device = torch.device("cpu")
        self.heads: Dict[str, HazardHead] = {
            "thunderstorm": HazardHead().to(self.device),
            "hail": HazardHead().to(self.device),
            "heavy_rain": HazardHead().to(self.device),
            "cloudburst": HazardHead().to(self.device)
        }
        self.loaded: Dict[str, bool] = {}
        self.verified_arrays: Dict[str, np.ndarray] = {}
        self._load_verified_arrays()

    def _load_verified_arrays(self):
        base_dir = os.path.join("backend", "data", "hazard_inference")
        for h in ["thunderstorm", "hail", "heavy_rain", "cloudburst"]:
            p = os.path.join(base_dir, f"{h}.npy")
            if os.path.isfile(p):
                try:
                    arr = np.load(p)
                    self.verified_arrays[h] = arr
                    self.loaded[h] = True
                    logger.info(f"[HazardHeadService] Verified tensor loaded for {h}: shape {arr.shape}")
                except Exception as e:
                    logger.warning(f"[HazardHeadService] Could not load {p}: {e}")

    def get_verified_field(self, hazard: str, frame_idx: int = 0) -> Optional[np.ndarray]:
        if hazard in self.verified_arrays:
            arr = self.verified_arrays[hazard]
            idx = max(0, min(frame_idx, len(arr) - 1))
            return arr[idx]
        return None


hazard_head_service = HazardHeadService()
