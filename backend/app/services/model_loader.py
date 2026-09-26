"""
Model Loader Service for ConvGRU Residual Nowcaster.
Responsible for:
1. Safe loading of trained PyTorch checkpoint (backend/models/convgru_best.pt).
2. Loading normalization configuration (backend/models/normalization.json).
3. Loading training metadata (backend/models/training_config.json).
4. Loading evaluation metrics (backend/models/metrics.json).
5. Enforcing model.eval() and validating tensor compatibility.
6. Refusing random/untrained weights: reports 'TRAINED MODEL NOT AVAILABLE'.
"""
import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import cv2
import torch
import torch.nn as nn

from backend.app.config import settings

logger = logging.getLogger(__name__)

class ConvGRUCell(nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super(ConvGRUCell, self).__init__()
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        padding = kernel_size // 2

        self.conv_gates = nn.Conv2d(
            in_channels + hidden_channels,
            2 * hidden_channels,
            kernel_size=kernel_size,
            padding=padding
        )
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
    def __init__(self, in_channels: int = 5, hidden_channels: int = 16, kernel_size: int = 3):
        super(ConvGRUResidualNetwork, self).__init__()
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        self.convgru = ConvGRUCell(in_channels, hidden_channels, kernel_size=kernel_size)
        self.residual_head = nn.Sequential(
            nn.Conv2d(hidden_channels, 8, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(8, 1, kernel_size=3, padding=1),
            nn.Tanh()
        )

    def forward(self, x: torch.Tensor, h_prev: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        h = self.convgru(x, h_prev)
        # Bounded residual adjustment (-0.35 to +0.35 convective scale)
        residual = self.residual_head(h) * 0.35
        return residual, h


class ModelLoaderService:
    CHECKPOINT_FILENAME = "convgru_best.pt"
    NORMALIZATION_FILENAME = "normalization.json"
    CONFIG_FILENAME = "training_config.json"
    METRICS_FILENAME = "metrics.json"

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or settings.MODEL_DIR
        self.device = torch.device("cpu")
        self.model: Optional[ConvGRUResidualNetwork] = None
        self.is_trained: bool = False
        self.status: str = "not_trained"
        self.message: str = "TRAINED MODEL NOT AVAILABLE"
        
        self.normalization: Optional[Dict[str, Any]] = None
        self.training_config: Optional[Dict[str, Any]] = None
        self.metrics: Optional[Dict[str, Any]] = None
        
        # Attempt to load checkpoint and metadata
        self.reload()

    def get_paths(self) -> Dict[str, str]:
        return {
            "checkpoint": os.path.join(self.model_dir, self.CHECKPOINT_FILENAME),
            "normalization": os.path.join(self.model_dir, self.NORMALIZATION_FILENAME),
            "training_config": os.path.join(self.model_dir, self.CONFIG_FILENAME),
            "metrics": os.path.join(self.model_dir, self.METRICS_FILENAME)
        }

    def reload(self) -> bool:
        """
        Scans model_dir for checkpoint and metadata.
        Never generates or uses random weights.
        """
        paths = self.get_paths()
        ckpt_path = paths["checkpoint"]

        # Check for checkpoint existence
        if not os.path.exists(ckpt_path):
            self.model = None
            self.is_trained = False
            self.status = "not_trained"
            self.message = f"TRAINED MODEL NOT AVAILABLE: '{ckpt_path}' not found."
            logger.warning(self.message)
            return False

        # Load metadata files if present
        if os.path.exists(paths["normalization"]):
            try:
                with open(paths["normalization"], "r") as f:
                    self.normalization = json.load(f)
            except Exception as e:
                logger.error(f"Error reading normalization.json: {e}")
                self.normalization = None
        else:
            self.normalization = None

        if os.path.exists(paths["training_config"]):
            try:
                with open(paths["training_config"], "r") as f:
                    self.training_config = json.load(f)
            except Exception as e:
                logger.error(f"Error reading training_config.json: {e}")
                self.training_config = None
        else:
            self.training_config = None

        if os.path.exists(paths["metrics"]):
            try:
                with open(paths["metrics"], "r") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Error reading metrics.json: {e}")
                self.metrics = None
        else:
            self.metrics = None

        # Determine architecture hyperparameters from training_config if available
        in_channels = 5
        hidden_channels = 16
        kernel_size = 3
        if self.training_config:
            in_channels = self.training_config.get("in_channels", in_channels)
            hidden_channels = self.training_config.get("hidden_channels", hidden_channels)
            kernel_size = self.training_config.get("kernel_size", kernel_size)

        try:
            model = ConvGRUResidualNetwork(
                in_channels=in_channels,
                hidden_channels=hidden_channels,
                kernel_size=kernel_size
            ).to(self.device)

            # Load checkpoint state_dict
            loaded = torch.load(ckpt_path, map_location=self.device)
            if isinstance(loaded, dict) and "state_dict" in loaded:
                state_dict = loaded["state_dict"]
            elif isinstance(loaded, dict) and "model_state_dict" in loaded:
                state_dict = loaded["model_state_dict"]
            elif isinstance(loaded, dict):
                state_dict = loaded
            else:
                raise ValueError("Checkpoint does not contain a valid PyTorch state_dict.")

            model.load_state_dict(state_dict)
            model.eval()

            # Validate tensor compatibility with test forward pass
            dummy_in = torch.zeros(1, in_channels, 128, 128, device=self.device)
            with torch.no_grad():
                res, _ = model(dummy_in)
                if res.shape != (1, 1, 128, 128):
                    raise ValueError(f"Incompatible output shape: expected (1, 1, 128, 128), got {res.shape}")

            self.model = model
            self.is_trained = True
            self.status = "trained"
            self.message = "Trained ConvGRU checkpoint loaded and active."
            logger.info("Successfully loaded trained ConvGRU checkpoint.")
            return True

        except Exception as e:
            self.model = None
            self.is_trained = False
            self.status = "not_trained"
            self.message = f"Failed to load checkpoint '{ckpt_path}': {str(e)}"
            logger.error(self.message)
            return False

    def get_model_info(self) -> Dict[str, Any]:
        """
        Returns info for GET /model-info
        Complies strictly with:
        If checkpoint does not exist:
        { "status": "not_trained" }
        """
        if not self.is_trained or self.model is None:
            return {
                "status": "not_trained",
                "message": "TRAINED MODEL NOT AVAILABLE",
                "model": "ConvGRU Residual Nowcaster",
                "version": "convnowcast-v0.1",
                "expected_checkpoint": self.CHECKPOINT_FILENAME,
                "expected_files": [
                    "backend/models/convgru_best.pt",
                    "backend/models/normalization.json",
                    "backend/models/training_config.json",
                    "backend/models/metrics.json"
                ]
            }

        # Trained checkpoint info
        training_dataset = "INSAT-3D Historical Convective Dataset (07-NOV-2019)"
        if self.training_config and "dataset_info" in self.training_config:
            d_info = self.training_config["dataset_info"]
            if isinstance(d_info, dict):
                training_dataset = d_info.get("name", training_dataset)
            elif isinstance(d_info, str):
                training_dataset = d_info

        trained_at = None
        if self.metrics and "trained_at" in self.metrics:
            trained_at = self.metrics["trained_at"]
        elif self.training_config and "trained_at" in self.training_config:
            trained_at = self.training_config["trained_at"]

        return {
            "model": "ConvGRU Residual Nowcaster",
            "version": self.training_config.get("version", "convnowcast-v0.1") if self.training_config else "convnowcast-v0.1",
            "status": "trained",
            "checkpoint": self.CHECKPOINT_FILENAME,
            "training_dataset": training_dataset,
            "metrics": self.metrics or {},
            "trained_at": trained_at or "Colab training run",
            "inference_device": str(self.device),
            "normalization": self.normalization,
            "training_config": self.training_config
        }

    def normalize(self, field: np.ndarray) -> np.ndarray:
        """
        Normalize using the exact loaded normalization configuration.
        """
        if not self.normalization:
            # Fallback only if no normalization is supplied yet
            return np.clip((field - 200.0) / (280.0 - 200.0), 0.0, 1.0)

        method = self.normalization.get("method", "minmax")
        if method == "minmax":
            val_min = self.normalization.get("input_min", 180.0)
            val_max = self.normalization.get("input_max", 320.0)
            return np.clip((field - val_min) / (val_max - val_min + 1e-6), 0.0, 1.0)
        elif method == "zscore":
            mean = self.normalization.get("mean", 240.0)
            std = self.normalization.get("std", 30.0)
            return (field - mean) / (std + 1e-6)
        elif method == "kelvin_scale":
            return np.clip((field - 200.0) / 80.0, 0.0, 1.0)
        else:
            return np.clip(field, 0.0, 1.0)

    def predict_residual(self,
                         prev_frame: np.ndarray,
                         curr_frame: np.ndarray,
                         flow: np.ndarray,
                         env_field: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Inference on 128x128 grid using the loaded trained ConvGRU.
        Raises RuntimeError if model is not trained.
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("TRAINED MODEL NOT AVAILABLE: Missing backend/models/convgru_best.pt")

        h, w = curr_frame.shape
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

# Singleton instance
model_loader_service = ModelLoaderService()
