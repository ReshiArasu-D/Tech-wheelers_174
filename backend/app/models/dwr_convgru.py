"""
Dynamic Indian DWR ConvGRU Inference Pipeline
=============================================
Provides runtime loading and inference for Doppler Weather Radar (DWR) data
using the trained ConvGRU checkpoint.

Contract:
  Input:  [B, 5, 3, 128, 128]
          Channel 0: Reflectivity (dBZ)
          Channel 1: Radial Velocity (m/s)
          Channel 2: Radar Validity Mask (0/1)
  Output: [B, 128, 128] predicted reflectivity field

Design Principles:
  1. No hardcoded file paths, event dates, timestamps, sensor values, or predictions.
  2. Dynamically loads from model artifact registry / configuration.
  3. Preprocesses and predicts ONLY from actual incoming DWR frames.
  4. Returns None when DWR data or model is absent, preserving fallback behavior.
"""
import os
import logging
from typing import Optional, Dict, Any, Union
import numpy as np
import torch
import torch.nn as nn
import cv2

from backend.app.config import settings
from backend.app.services.model_registry import model_registry

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# ConvGRU Architecture matching trained RadarConvGRU checkpoint
# ──────────────────────────────────────────────────────────────────────────────

class RadarConvGRUCell(nn.Module):
    """ConvGRU cell for 3-channel radar sequence processing."""
    def __init__(self, in_channels: int = 3, hidden_channels: int = 32, kernel_size: int = 3):
        super().__init__()
        self.hidden_channels = hidden_channels
        padding = kernel_size // 2
        total_in = in_channels + hidden_channels  # 3 + 32 = 35

        self.conv_z = nn.Conv2d(total_in, hidden_channels, kernel_size=kernel_size, padding=padding)
        self.conv_r = nn.Conv2d(total_in, hidden_channels, kernel_size=kernel_size, padding=padding)
        self.conv_h = nn.Conv2d(total_in, hidden_channels, kernel_size=kernel_size, padding=padding)

    def forward(self, x: torch.Tensor, h: Optional[torch.Tensor] = None) -> torch.Tensor:
        if h is None:
            h = torch.zeros(x.size(0), self.hidden_channels, x.size(2), x.size(3), device=x.device, dtype=x.dtype)
        xh = torch.cat([x, h], dim=1)
        z = torch.sigmoid(self.conv_z(xh))
        r = torch.sigmoid(self.conv_r(xh))
        x_rh = torch.cat([x, r * h], dim=1)
        h_cand = torch.tanh(self.conv_h(x_rh))
        h_next = (1.0 - z) * h + z * h_cand
        return h_next


class RadarConvGRU(nn.Module):
    """
    Sequence-to-one Radar ConvGRU network.
    Maps [B, 5, 3, 128, 128] -> [B, 128, 128]
    """
    def __init__(self, in_channels: int = 3, hidden_channels: int = 32, kernel_size: int = 3):
        super().__init__()
        self.cell = RadarConvGRUCell(in_channels, hidden_channels, kernel_size)
        self.head = nn.Sequential(
            nn.Conv2d(hidden_channels, 16, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(16, 1, kernel_size=1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 4:
            x = x.unsqueeze(0)  # [1, T, C, H, W]
        B, seq_len, C, H, W = x.shape
        h = None
        for t in range(seq_len):
            h = self.cell(x[:, t], h)
        out = self.head(h)  # [B, 1, H, W]
        return out.squeeze(1)  # [B, H, W]

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 4:
            x = x.unsqueeze(0)  # [1, T, C, H, W]
        B, seq_len, C, H, W = x.shape
        h = None
        for t in range(seq_len):
            h = self.cell(x[:, t], h)
        return h  # [B, 32, H, W]


class TERLSGRUCell(nn.Module):
    """
    Single-conv GRU cell matching the TERLS checkpoint architecture.
    Merges z, r, h gates into one 3*hidden convolution.
    Keys: gru.conv.weight  (3*hidden, in+hidden, k, k)
           gru.conv.bias   (3*hidden,)
    """
    def __init__(self, in_channels: int = 3, hidden_channels: int = 32, kernel_size: int = 3):
        super().__init__()
        self.hidden_channels = hidden_channels
        self.conv = nn.Conv2d(
            in_channels + hidden_channels,
            3 * hidden_channels,
            kernel_size=kernel_size,
            padding=kernel_size // 2
        )

    def forward(self, x: torch.Tensor, h: Optional[torch.Tensor] = None) -> torch.Tensor:
        if h is None:
            h = torch.zeros(x.size(0), self.hidden_channels, x.size(2), x.size(3),
                            device=x.device, dtype=x.dtype)
        gates = self.conv(torch.cat([x, h], dim=1))  # (B, 3*H, H, W)
        z, r, h_cand = gates.chunk(3, dim=1)
        z = torch.sigmoid(z)
        r = torch.sigmoid(r)
        h_cand = torch.tanh(h_cand)
        return (1.0 - z) * h + z * h_cand


class TERLSRadarConvGRU(nn.Module):
    """
    Sequence-to-one Radar ConvGRU matching radar_convgru_india_20191107.pt.
    State dict keys:
      gru.conv.*   (single merged GRU convolution)
      head.weight / head.bias  (1x1 Conv2d output projection)
    Input:  [B, 5, 3, 128, 128]
    Output: [B, 128, 128]
    DO NOT MODIFY this class -- it must match the trained checkpoint.
    """
    def __init__(self, in_channels: int = 3, hidden_channels: int = 32, kernel_size: int = 3):
        super().__init__()
        self.gru = TERLSGRUCell(in_channels, hidden_channels, kernel_size)
        self.head = nn.Conv2d(hidden_channels, 1, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 4:
            x = x.unsqueeze(0)
        B, seq_len, C, H, W = x.shape
        h = None
        for t in range(seq_len):
            h = self.gru(x[:, t], h)
        return self.head(h).squeeze(1)  # [B, H, W]

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 4:
            x = x.unsqueeze(0)
        B, seq_len, C, H, W = x.shape
        h = None
        for t in range(seq_len):
            h = self.gru(x[:, t], h)
        return h  # [B, 32, H, W]


# ──────────────────────────────────────────────────────────────────────────────
# DWR Preprocessor Contract: [5, 3, 128, 128]
# ──────────────────────────────────────────────────────────────────────────────

class DWRPreprocessor:
    """
    Validates and transforms raw incoming DWR scan frames into
    the model input contract [B, 5, 3, 128, 128].
    """
    TARGET_SEQ_LEN = 5
    TARGET_CHANNELS = 3
    TARGET_SIZE = 128

    def __init__(self,
                 dbz_min: float = 0.0,
                 dbz_max: float = 70.0,
                 vel_min: float = -30.0,
                 vel_max: float = 30.0):
        self.dbz_min = dbz_min
        self.dbz_max = dbz_max
        self.vel_min = vel_min
        self.vel_max = vel_max

    def transform(self, incoming_data: Union[np.ndarray, Dict[str, Any]], device: torch.device) -> Optional[torch.Tensor]:
        """
        Accepts incoming DWR frames in standard numpy formats:
          - Tensor-like array of shape (5, 3, H, W) or (B, 5, 3, H, W)
          - Dictionary containing keys: 'dbz_sequence', 'vel_sequence', 'mask_sequence'
        Returns torch.Tensor of shape (1, 5, 3, 128, 128) normalized to [0, 1],
        or None if incoming data does not contain valid scans.
        """
        if incoming_data is None:
            return None

        # Format 1: Dictionary with channel sequences
        if isinstance(incoming_data, dict):
            if "raw_tensor" in incoming_data:
                arr = incoming_data["raw_tensor"]
            elif "sequence" in incoming_data:
                arr = incoming_data["sequence"]
            elif "dbz_sequence" in incoming_data:
                dbz_seq = incoming_data["dbz_sequence"]
                vel_seq = incoming_data.get("vel_sequence")
                mask_seq = incoming_data.get("mask_sequence")
                return self._from_channel_sequences(dbz_seq, vel_seq, mask_seq, device)
            elif "frames" in incoming_data:
                arr = incoming_data["frames"]
            else:
                return None
        else:
            arr = incoming_data

        if not isinstance(arr, np.ndarray) and not isinstance(arr, torch.Tensor):
            return None

        if isinstance(arr, torch.Tensor):
            arr = arr.detach().cpu().numpy()

        # Handle batch dimension if present
        if arr.ndim == 5:
            arr = arr[0]  # Take first sequence: (5, 3, H, W) or (5, H, W, 3)

        if arr.ndim != 4:
            logger.warning(f"DWRPreprocessor: expected 4D sequence, got shape {arr.shape}")
            return None

        # Ensure (T=5, C=3, H, W) layout
        if arr.shape[1] == 3:
            # (T, 3, H, W)
            pass
        elif arr.shape[-1] == 3:
            # (T, H, W, 3) -> transpose to (T, 3, H, W)
            arr = np.transpose(arr, (0, 3, 1, 2))
        else:
            logger.warning(f"DWRPreprocessor: expected 3 channels (DBZ, Vel, Mask), got {arr.shape}")
            return None

        T, C, H, W = arr.shape
        if T < self.TARGET_SEQ_LEN:
            logger.warning(f"DWRPreprocessor: sequence length {T} < required {self.TARGET_SEQ_LEN}")
            return None
        elif T > self.TARGET_SEQ_LEN:
            # Take latest 5 frames
            arr = arr[-self.TARGET_SEQ_LEN:]

        # Resize spatial dimensions to 128x128 and normalize channels
        processed_frames = []
        for t in range(self.TARGET_SEQ_LEN):
            dbz_frame = arr[t, 0].astype(np.float32)
            vel_frame = arr[t, 1].astype(np.float32)
            msk_frame = arr[t, 2].astype(np.float32)

            if dbz_frame.shape != (self.TARGET_SIZE, self.TARGET_SIZE):
                dbz_frame = cv2.resize(dbz_frame, (self.TARGET_SIZE, self.TARGET_SIZE), interpolation=cv2.INTER_AREA)
                vel_frame = cv2.resize(vel_frame, (self.TARGET_SIZE, self.TARGET_SIZE), interpolation=cv2.INTER_AREA)
                msk_frame = cv2.resize(msk_frame, (self.TARGET_SIZE, self.TARGET_SIZE), interpolation=cv2.INTER_NEAREST)

            # Normalize Channel 0: Reflectivity [dbz_min, dbz_max] -> [0, 1]
            dbz_norm = np.clip((dbz_frame - self.dbz_min) / (self.dbz_max - self.dbz_min + 1e-6), 0.0, 1.0)
            # Normalize Channel 1: Radial velocity [vel_min, vel_max] -> [0, 1]
            vel_norm = np.clip((vel_frame - self.vel_min) / (self.vel_max - self.vel_min + 1e-6), 0.0, 1.0)
            # Channel 2: Mask [0, 1]
            msk_norm = np.clip(msk_frame, 0.0, 1.0)

            frame_stack = np.stack([dbz_norm, vel_norm, msk_norm], axis=0)  # (3, 128, 128)
            processed_frames.append(frame_stack)

        tensor_np = np.stack(processed_frames, axis=0)  # (5, 3, 128, 128)
        tensor = torch.from_numpy(tensor_np).unsqueeze(0).float().to(device)  # (1, 5, 3, 128, 128)
        return tensor

    def _from_channel_sequences(self,
                                dbz_seq: np.ndarray,
                                vel_seq: Optional[np.ndarray],
                                mask_seq: Optional[np.ndarray],
                                device: torch.device) -> Optional[torch.Tensor]:
        if not isinstance(dbz_seq, np.ndarray) or dbz_seq.ndim != 3:
            return None
        T = dbz_seq.shape[0]
        if T < self.TARGET_SEQ_LEN:
            return None
        dbz_seq = dbz_seq[-self.TARGET_SEQ_LEN:]

        if vel_seq is None or not isinstance(vel_seq, np.ndarray):
            vel_seq = np.zeros_like(dbz_seq)
        else:
            vel_seq = vel_seq[-self.TARGET_SEQ_LEN:]

        if mask_seq is None or not isinstance(mask_seq, np.ndarray):
            mask_seq = np.ones_like(dbz_seq)
        else:
            mask_seq = mask_seq[-self.TARGET_SEQ_LEN:]

        arr = np.stack([dbz_seq, vel_seq, mask_seq], axis=1)  # (5, 3, H, W)
        return self.transform(arr, device)


# ──────────────────────────────────────────────────────────────────────────────
# DWR Inference Service (Dynamic Checkpoint & Frame Execution)
# ──────────────────────────────────────────────────────────────────────────────

class DWRConvGRUService:
    """
    Dynamic loader and inference manager for Indian DWR ConvGRU.
    Never hardcodes paths, dates, or output values.
    """
    def __init__(self):
        self.device = torch.device("cpu")
        self.model: Optional[RadarConvGRU] = None
        self.preprocessor = DWRPreprocessor()
        self.is_loaded: bool = False
        self.status: str = "PENDING_COLAB"
        self.checkpoint_path: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
        self.error_message: Optional[str] = None

        self.reload()

    def reload(self) -> bool:
        """
        Dynamically discovers and loads the trained checkpoint using
        the registered model descriptor and configuration paths.
        """
        desc = model_registry.get_descriptor("indian_dwr_convgru") or model_registry.get_descriptor("radar_encoder")
        ckpt_path = None

        # 1. Check registry's resolved path
        if desc and desc.loaded_path and os.path.isfile(desc.loaded_path):
            ckpt_path = desc.loaded_path

        # 2. Check dynamic settings.DWR_MODEL_PATH
        if not ckpt_path and getattr(settings, "DWR_MODEL_PATH", None):
            custom = settings.DWR_MODEL_PATH.strip()
            if custom and os.path.isfile(custom):
                ckpt_path = custom

        # 3. Search candidate locations dynamically via registry helper
        if not ckpt_path and desc:
            ckpt_path = model_registry._find_checkpoint_file(desc)

        if not ckpt_path:
            self.model = None
            self.is_loaded = False
            self.status = "PENDING_COLAB"
            self.checkpoint_path = None
            self.error_message = "No DWR checkpoint found in registered model paths or DWR_MODEL_PATH."
            return False

        try:
            raw = torch.load(ckpt_path, map_location=self.device, weights_only=False)
            if isinstance(raw, dict):
                state_dict = raw.get("model_state_dict", raw.get("state_dict", raw))
                self.metadata = {
                    "model_class": raw.get("model_class", "RadarConvGRU"),
                    "parameters": raw.get("parameters"),
                    "input_shape": raw.get("input_shape", [5, 3, 128, 128]),
                    "output_shape": raw.get("output_shape", [128, 128]),
                    "channels": raw.get("channels", ["reflectivity", "velocity", "radar_validity_mask"]),
                    "filename": os.path.basename(ckpt_path)
                }
            else:
                state_dict = raw
                self.metadata = {"filename": os.path.basename(ckpt_path)}

            cleaned_sd = {k.replace("module.", ""): v for k, v in state_dict.items()}

            # Try TERLS architecture first (matches radar_convgru_india_20191107.pt)
            net = None
            for ModelClass in [TERLSRadarConvGRU, RadarConvGRU]:
                try:
                    candidate = ModelClass(in_channels=3, hidden_channels=32, kernel_size=3).to(self.device)
                    candidate.load_state_dict(cleaned_sd, strict=True)
                    net = candidate
                    logger.info(f"DWRConvGRUService: Loaded with {ModelClass.__name__}")
                    break
                except RuntimeError:
                    continue

            if net is None:
                raise ValueError("Checkpoint does not match any known DWR model architecture (tried TERLSRadarConvGRU, RadarConvGRU).")

            net.eval()
            # Validate forward pass with zero tensor (no data dependency)
            with torch.no_grad():
                dummy = torch.zeros(1, 5, 3, 128, 128, device=self.device)
                out = net(dummy)
                if out.shape != (1, 128, 128):
                    raise ValueError(f"Unexpected output shape from DWR model: {out.shape}")

            self.model = net
            self.is_loaded = True
            self.status = "LOADED"
            self.checkpoint_path = ckpt_path
            self.error_message = None
            logger.info(f"DWRConvGRUService: Successfully loaded DWR model from {ckpt_path}")
            return True

        except Exception as e:
            self.model = None
            self.is_loaded = False
            self.status = "ERROR"
            self.checkpoint_path = ckpt_path
            self.error_message = f"Failed to load DWR model checkpoint: {str(e)}"
            logger.error(self.error_message)
            return False

    def predict_from_incoming(self, incoming_dwr_data: Any) -> Optional[np.ndarray]:
        """
        Executes inference on actual incoming DWR frames.
        Never fabricates values or returns static outputs.
        Returns predicted reflectivity (128, 128) float32 array, or None if unavailable.
        """
        if not self.is_loaded or self.model is None:
            return None

        if incoming_dwr_data is None:
            return None

        input_tensor = self.preprocessor.transform(incoming_dwr_data, self.device)
        if input_tensor is None:
            return None

        with torch.no_grad():
            output_tensor = self.model(input_tensor)  # (1, 128, 128)
            pred = output_tensor.squeeze(0).cpu().numpy().astype(np.float32)

        return pred

    def extract_features_from_incoming(self, incoming_dwr_data: Any) -> Optional[np.ndarray]:
        """
        Extracts genuine 32-channel hidden representation [32, 128, 128]
        from the ConvGRU sequence processing.
        """
        if not self.is_loaded or self.model is None or incoming_dwr_data is None:
            return None
        input_tensor = self.preprocessor.transform(incoming_dwr_data, self.device)
        if input_tensor is None:
            return None
        with torch.no_grad():
            feat = self.model.extract_features(input_tensor)  # (1, 32, 128, 128)
            return feat.squeeze(0).cpu().numpy().astype(np.float32)

    def get_status_info(self) -> Dict[str, Any]:
        """Returns runtime model metadata for health and diagnostics."""
        return {
            "model_id": "indian_dwr_convgru",
            "name": "Indian TERLS DWR ConvGRU",
            "status": self.status,
            "is_loaded": self.is_loaded,
            "checkpoint_path": self.checkpoint_path,
            "input_contract": "[5, 3, 128, 128] (DBZ, Radial Velocity, Validity Mask)",
            "output_contract": "[128, 128] Predicted Reflectivity",
            "metadata": self.metadata,
            "error_message": self.error_message
        }


# Dynamic singleton instance
dwr_service = DWRConvGRUService()
