"""
Downburst Temporal GRU model and inference service.
Architecture reconstructed from SIH 26084 training pipeline (Cell 989 in Colab).
Checkpoint: downburst_thunderr_gru.pt (118,274 parameters).
"""
import os
import logging
from typing import Dict, Any, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class DownburstTemporalGRU(nn.Module):
    """
    Bidirectional 2-layer Temporal GRU with LayerNorm and Temporal Attention.
    Trained on THUNDERR downburst records (118,274 parameters).
    Input: [B, 60, 4] (temporal window of 60 seconds, 4 kinematic features)
    Output: [B] (downburst probability in [0, 1])
    """
    def __init__(self, input_size: int = 4, hidden_size: int = 64, layers: int = 2):
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=layers,
            batch_first=True,
            dropout=0.15 if layers > 1 else 0.0,
            bidirectional=True
        )
        self.norm = nn.LayerNorm(hidden_size * 2)
        self.attention = nn.Sequential(
            nn.Linear(hidden_size * 2, 64),
            nn.Tanh(),
            nn.Linear(64, 1)
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_size * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.20),
            nn.Linear(64, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, 60, 4]
        h, _ = self.gru(x)
        h = self.norm(h)
        weights = torch.softmax(self.attention(h), dim=1)
        context = torch.sum(h * weights, dim=1)
        logits = self.head(context).squeeze(-1)
        return torch.sigmoid(logits)


class DownburstService:
    def __init__(self, checkpoint_path: Optional[str] = None):
        self.device = torch.device("cpu")
        self.model = DownburstTemporalGRU().to(self.device)
        self.is_loaded = False
        self.checkpoint_metadata: Dict[str, Any] = {}
        self.load_checkpoint(checkpoint_path)

    def load_checkpoint(self, path: Optional[str] = None) -> bool:
        candidate_paths = [
            path,
            os.path.join("backend", "models", "downburst", "downburst_thunderr_gru.pt"),
            os.path.join("backend", "models", "downburst_thunderr_gru.pt"),
            r"D:\downburst_thunderr_gru.pt"
        ]
        target_path = next((p for p in candidate_paths if p and os.path.isfile(p)), None)
        if not target_path:
            logger.warning("[DownburstService] Checkpoint downburst_thunderr_gru.pt not found.")
            return False

        try:
            ckpt = torch.load(target_path, map_location=self.device, weights_only=False)
            state_dict = ckpt.get("model_state_dict", ckpt)
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self.is_loaded = True
            self.checkpoint_metadata = {
                "checkpoint_path": target_path,
                "parameters": sum(p.numel() for p in self.model.parameters()),
                "sampling_rate_hz": ckpt.get("sampling_rate_hz", 1.0),
                "sequence_length": ckpt.get("sequence_length", 60),
                "best_val_loss": ckpt.get("best_val_loss"),
                "records": ckpt.get("records", 99),
                "official_events": ckpt.get("official_events", 29),
            }
            logger.info(f"[DownburstService] Loaded {target_path} ({self.checkpoint_metadata['parameters']:,} params)")
            return True
        except Exception as e:
            logger.error(f"[DownburstService] Failed to load checkpoint {target_path}: {e}")
            self.is_loaded = False
            return False

    def predict(self, temporal_features: np.ndarray) -> Dict[str, Any]:
        """
        Run inference on kinematic wind/pressure temporal series.
        temporal_features: array of shape [B, 60, 4] or [60, 4]
        Returns probability dict.
        """
        if not self.is_loaded:
            return {
                "probability": 0.0,
                "status": "UNAVAILABLE",
                "model": "DownburstTemporalGRU (Not Loaded)"
            }

        arr = np.asarray(temporal_features, dtype=np.float32)
        if arr.ndim == 2:
            arr = np.expand_dims(arr, 0)  # [1, 60, 4]

        with torch.no_grad():
            tensor_in = torch.from_numpy(arr).to(self.device)
            prob = self.model(tensor_in).cpu().numpy()

        p_val = float(prob[0]) if len(prob) > 0 else 0.0
        severity = "HIGH" if p_val >= 0.70 else "MEDIUM" if p_val >= 0.40 else "LOW"

        return {
            "probability": round(p_val, 4),
            "severity": severity,
            "status": "TRAINED_CHECKPOINT",
            "model": "DownburstTemporalGRU",
            "parameters": self.checkpoint_metadata.get("parameters", 118274),
            "window_seconds": 60,
            "provenance": "THUNDERR official dataset (Port LI/SP/GE records)"
        }


downburst_service = DownburstService()
