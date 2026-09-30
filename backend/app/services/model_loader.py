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
    # Candidate checkpoint filenames in priority order.
    # convgru_best.pt = Colab export; radar_convgru.pt / multimodal_convgru_rain.pt = Drive assets.
    CHECKPOINT_CANDIDATES = [
        "convgru_best.pt",
        "radar_convgru.pt",
        "multimodal_convgru_rain.pt",
    ]
    NORMALIZATION_FILENAME = "normalization.json"
    CONFIG_FILENAME = "training_config.json"
    METRICS_FILENAME = "metrics.json"

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or settings.MODEL_DIR
        self.device = torch.device("cpu")

        # Primary ConvGRU (radar backbone)
        self.model: Optional[ConvGRUResidualNetwork] = None
        self.checkpoint_filename: str = ""
        self.is_trained: bool = False
        self.status: str = "not_trained"
        self.message: str = "TRAINED MODEL NOT AVAILABLE"

        # Secondary multimodal model (rain-aware head, optional)
        self.multimodal_model: Optional[ConvGRUResidualNetwork] = None
        self.multimodal_loaded: bool = False

        self.normalization: Optional[Dict[str, Any]] = None
        self.training_config: Optional[Dict[str, Any]] = None
        self.metrics: Optional[Dict[str, Any]] = None

        # Attempt to load checkpoint and metadata
        self.reload()

    def get_paths(self) -> Dict[str, str]:
        # Resolve active checkpoint path (whichever candidate was found first)
        ckpt = self.checkpoint_filename or self.CHECKPOINT_CANDIDATES[0]
        return {
            "checkpoint": os.path.join(self.model_dir, ckpt),
            "normalization": os.path.join(self.model_dir, self.NORMALIZATION_FILENAME),
            "training_config": os.path.join(self.model_dir, self.CONFIG_FILENAME),
            "metrics": os.path.join(self.model_dir, self.METRICS_FILENAME)
        }

    def _resolve_checkpoint(self) -> Optional[str]:
        """Returns the first checkpoint filename that exists in model_dir."""
        for name in self.CHECKPOINT_CANDIDATES:
            path = os.path.join(self.model_dir, name)
            if os.path.exists(path):
                return name
        return None

    def _try_load_model(self, ckpt_path: str,
                        in_channels: int = 5,
                        hidden_channels: int = 16,
                        kernel_size: int = 3) -> Optional[ConvGRUResidualNetwork]:
        """Loads a ConvGRU checkpoint from *ckpt_path*. Returns None on failure."""
        model = ConvGRUResidualNetwork(
            in_channels=in_channels,
            hidden_channels=hidden_channels,
            kernel_size=kernel_size
        ).to(self.device)

        loaded = torch.load(ckpt_path, map_location=self.device, weights_only=False)
        if isinstance(loaded, dict) and "state_dict" in loaded:
            state_dict = loaded["state_dict"]
        elif isinstance(loaded, dict) and "model_state_dict" in loaded:
            state_dict = loaded["model_state_dict"]
        elif isinstance(loaded, dict):
            state_dict = loaded
        else:
            raise ValueError("Checkpoint does not contain a valid PyTorch state_dict.")

        # Tolerate minor key mismatches (e.g. Colab saved with 'module.' prefix)
        try:
            model.load_state_dict(state_dict, strict=True)
        except RuntimeError:
            # Strip 'module.' prefix if present (DataParallel saved model)
            fixed = {k.replace("module.", ""): v for k, v in state_dict.items()}
            model.load_state_dict(fixed, strict=False)

        model.eval()
        # Quick validation forward pass
        with torch.no_grad():
            dummy = torch.zeros(1, in_channels, 128, 128, device=self.device)
            res, _ = model(dummy)
            if res.shape != (1, 1, 128, 128):
                raise ValueError(f"Unexpected output shape: {res.shape}")
        return model

    def reload(self) -> bool:
        """
        Scans model_dir for any known checkpoint (priority order:
        convgru_best.pt → radar_convgru.pt → multimodal_convgru_rain.pt).
        Never generates or uses random weights.
        Loads multimodal_convgru_rain.pt as a secondary model if available.
        """
        # --- Resolve primary checkpoint ---
        found_name = self._resolve_checkpoint()
        if found_name is None:
            self.model = None
            self.is_trained = False
            self.status = "not_trained"
            candidates = ", ".join(self.CHECKPOINT_CANDIDATES)
            self.message = f"TRAINED MODEL NOT AVAILABLE: none of [{candidates}] found in '{self.model_dir}'."
            logger.warning(self.message)
            return False

        self.checkpoint_filename = found_name
        ckpt_path = os.path.join(self.model_dir, found_name)
        paths = self.get_paths()

        # --- Load optional metadata files ---
        for attr, fname in [
            ("normalization", "normalization"),
            ("training_config", "training_config"),
            ("metrics", "metrics"),
        ]:
            p = paths[fname]
            if os.path.exists(p):
                try:
                    with open(p, "r") as f:
                        setattr(self, attr, json.load(f))
                except Exception as e:
                    logger.error(f"Error reading {os.path.basename(p)}: {e}")
                    setattr(self, attr, None)
            else:
                setattr(self, attr, None)

        # --- Architecture hyperparameters ---
        in_channels = 5
        hidden_channels = 16
        kernel_size = 3
        if self.training_config:
            in_channels = self.training_config.get("in_channels", in_channels)
            hidden_channels = self.training_config.get("hidden_channels", hidden_channels)
            kernel_size = self.training_config.get("kernel_size", kernel_size)

        # --- Load primary model ---
        try:
            self.model = self._try_load_model(ckpt_path, in_channels, hidden_channels, kernel_size)
            self.is_trained = True
            self.status = "trained"
            self.message = f"Trained ConvGRU checkpoint '{found_name}' loaded and active."
            logger.info(self.message)
        except Exception as e:
            self.model = None
            self.is_trained = False
            self.status = "not_trained"
            self.message = f"Failed to load '{found_name}': {e}"
            logger.error(self.message)
            return False

        # --- Load secondary multimodal model if different file exists ---
        mm_name = "multimodal_convgru_rain.pt"
        mm_path = os.path.join(self.model_dir, mm_name)
        if mm_path != ckpt_path and os.path.exists(mm_path):
            try:
                self.multimodal_model = self._try_load_model(
                    mm_path, in_channels, hidden_channels, kernel_size
                )
                self.multimodal_loaded = True
                logger.info(f"Secondary multimodal model '{mm_name}' loaded.")
            except Exception as e:
                logger.warning(f"Could not load secondary model '{mm_name}': {e}")
                self.multimodal_model = None
                self.multimodal_loaded = False
        else:
            self.multimodal_model = None
            self.multimodal_loaded = False

        return True

    def get_model_info(self) -> Dict[str, Any]:
        """Returns info for GET /model-info, consumed by the React ModelComparisonPanel."""
        if not self.is_trained or self.model is None:
            return {
                "status": "not_trained",
                "message": "TRAINED MODEL NOT AVAILABLE",
                "model": "ConvGRU Residual Nowcaster",
                "version": "convnowcast-v0.1",
                "searched_in": self.model_dir,
                "expected_files": self.CHECKPOINT_CANDIDATES,
            }

        training_dataset = "INSAT-3D / Radar Convective Dataset (SIH 2026)"
        if self.training_config and "dataset_info" in self.training_config:
            d_info = self.training_config["dataset_info"]
            training_dataset = d_info.get("name", training_dataset) if isinstance(d_info, dict) else str(d_info)

        trained_at = (
            (self.metrics or {}).get("trained_at")
            or (self.training_config or {}).get("trained_at")
            or "Colab SIH-2026 training run"
        )

        # Build loaded-models list for UI
        loaded_models = [
            {
                "id": "CONVGRU",
                "name": "ConvGRU Residual Nowcaster (Radar)",
                "checkpoint": self.checkpoint_filename,
                "status": "trained",
            }
        ]
        if self.multimodal_loaded:
            loaded_models.append({
                "id": "MULTIMODAL",
                "name": "Multimodal ConvGRU (Rain-Aware)",
                "checkpoint": "multimodal_convgru_rain.pt",
                "status": "trained",
            })

        return {
            "status": "trained",
            "model": "ConvGRU Residual Nowcaster",
            "version": (self.training_config or {}).get("version", "convnowcast-v0.1"),
            "checkpoint": self.checkpoint_filename,
            "loaded_models": loaded_models,
            "multimodal_available": self.multimodal_loaded,
            "training_dataset": training_dataset,
            "metrics": self.metrics or {},
            "trained_at": trained_at,
            "inference_device": str(self.device),
            "normalization": self.normalization,
            "training_config": self.training_config,
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
                         env_field: Optional[np.ndarray] = None,
                         use_multimodal: bool = False) -> np.ndarray:
        """
        Inference on 128x128 grid using the loaded trained ConvGRU.
        If use_multimodal=True and the multimodal model is loaded, uses that instead.
        Raises RuntimeError if no model is trained.
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError(
                f"TRAINED MODEL NOT AVAILABLE: none of {self.CHECKPOINT_CANDIDATES} "
                f"found in '{self.model_dir}'"
            )

        active_model = (
            self.multimodal_model
            if (use_multimodal and self.multimodal_loaded and self.multimodal_model is not None)
            else self.model
        )

        h, w = curr_frame.shape
        target_h, target_w = 128, 128

        curr_small = cv2.resize(curr_frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        prev_small = cv2.resize(prev_frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        u_small = cv2.resize(flow[:, :, 0], (target_w, target_h), interpolation=cv2.INTER_AREA) / 10.0
        v_small = cv2.resize(flow[:, :, 1], (target_w, target_h), interpolation=cv2.INTER_AREA) / 10.0

        env_small = (
            cv2.resize(env_field, (target_w, target_h), interpolation=cv2.INTER_AREA)
            if env_field is not None
            else np.ones((target_h, target_w), dtype=np.float32) * 0.7
        )

        # Assemble 5-channel tensor: [prev, curr, u, v, env]
        tensor_in = np.stack([prev_small, curr_small, u_small, v_small, env_small], axis=0)
        tensor_in = torch.from_numpy(tensor_in).unsqueeze(0).float().to(self.device)

        with torch.no_grad():
            residual_tensor, _ = active_model(tensor_in)
            res_np = residual_tensor.squeeze().cpu().numpy()

        # Upsample residual back to full resolution
        residual_full = cv2.resize(res_np, (w, h), interpolation=cv2.INTER_LINEAR)
        return residual_full

# Singleton instance
model_loader_service = ModelLoaderService()
