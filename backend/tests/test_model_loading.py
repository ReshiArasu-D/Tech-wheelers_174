"""
Tests for Model Loading, Checkpoint Validation, and Metadata
Verifies:
1. Missing checkpoint is detected (status: not_trained, clear error message).
2. Valid checkpoint loads correctly from temporary directory without polluting repository.
3. Loaded model enters eval mode (model.training is False).
4. Inference produces output with expected tensor dimensions:
   - Input shape: (B, 5, 128, 128)
   - Output shape: (B, 1, 128, 128)
5. /model-info reports correct state (not_trained when missing, trained with metadata when loaded).
"""
import os
import json
import pytest
import torch
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.model_loader import (
    ModelLoaderService,
    ConvGRUResidualNetwork,
    model_loader_service
)

client = TestClient(app)

def test_missing_checkpoint_detected(tmp_path):
    """1. Verify missing checkpoint is detected and reports not_trained."""
    empty_service = ModelLoaderService(model_dir=str(tmp_path))
    assert not empty_service.is_trained
    assert empty_service.status == "not_trained"
    assert "TRAINED MODEL NOT AVAILABLE" in empty_service.message
    assert empty_service.model is None

    # Test predict_residual raises RuntimeError
    dummy_frame = np.zeros((100, 100), dtype=np.float32)
    dummy_flow = np.zeros((100, 100, 2), dtype=np.float32)
    with pytest.raises(RuntimeError, match="TRAINED MODEL NOT AVAILABLE"):
        empty_service.predict_residual(dummy_frame, dummy_frame, dummy_flow)

def test_model_info_endpoint_reports_status():
    """5a. Verify /model-info reports model status and registry summary."""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["trained", "not_trained"]
    assert "registry" in data

def test_valid_checkpoint_loads_and_eval_mode(tmp_path):
    """2 & 3. Verify a valid checkpoint loads cleanly and enters eval mode using a temporary directory."""
    temp_dir = str(tmp_path)
    ckpt_path = os.path.join(temp_dir, "convgru_best.pt")
    norm_path = os.path.join(temp_dir, "normalization.json")
    config_path = os.path.join(temp_dir, "training_config.json")
    metrics_path = os.path.join(temp_dir, "metrics.json")

    # Create model weights for test
    temp_net = ConvGRUResidualNetwork(in_channels=5, hidden_channels=16, kernel_size=3)
    torch.save(temp_net.state_dict(), ckpt_path)

    # Create sample metadata files
    with open(norm_path, "w") as f:
        json.dump({
            "method": "minmax",
            "input_min": 190.0,
            "input_max": 310.0,
            "target_range": [0.0, 1.0]
        }, f)

    with open(config_path, "w") as f:
        json.dump({
            "model_architecture": "ConvGRUResidualNetwork",
            "input_sequence_length": 2,
            "output_sequence_length": 1,
            "spatial_dimensions": [128, 128],
            "in_channels": 5,
            "hidden_channels": 16,
            "kernel_size": 3,
            "epochs": 25,
            "learning_rate": 0.0005,
            "optimizer": "Adam",
            "loss": "MSE + BoundedResidualLoss",
            "dataset_info": {
                "name": "INSAT-3D Historical Convective Storm Replay (07-NOV-2019)"
            }
        }, f)

    with open(metrics_path, "w") as f:
        json.dump({
            "val_loss": 0.0142,
            "mse": 0.0125,
            "csi_score": 0.68,
            "trained_at": "2026-09-26T12:00:00Z"
        }, f)

    # Initialize loader with temporary directory
    loader = ModelLoaderService(model_dir=temp_dir)

    # 2. Checkpoint loads
    assert loader.is_trained is True
    assert loader.status == "trained"
    assert loader.model is not None

    # 3. Model enters eval mode
    assert loader.model.training is False

    # 4. Check tensor shapes
    # Expected input: (B=1, C=5, H=128, W=128)
    dummy_input = torch.randn(1, 5, 128, 128)
    with torch.no_grad():
        residual, hidden = loader.model(dummy_input)
    
    # Expected output: (B=1, C=1, H=128, W=128)
    assert residual.shape == (1, 1, 128, 128)
    assert hidden.shape == (1, 16, 128, 128)
    
    # Bounded residual: [-0.35, +0.35]
    assert torch.max(torch.abs(residual)).item() <= 0.3501

    # Test full 2D array prediction
    f0 = np.ones((200, 200), dtype=np.float32) * 0.5
    f1 = np.ones((200, 200), dtype=np.float32) * 0.6
    flow = np.zeros((200, 200, 2), dtype=np.float32)
    res_2d = loader.predict_residual(f0, f1, flow)
    assert res_2d.shape == (200, 200)

    # 5b. Check get_model_info returns trained status and metadata
    info = loader.get_model_info()
    assert info["status"] == "trained"
    assert info["checkpoint"] == "convgru_best.pt"
    assert info["metrics"]["val_loss"] == 0.0142
    assert info["training_dataset"] == "INSAT-3D Historical Convective Storm Replay (07-NOV-2019)"
    assert info["trained_at"] == "2026-09-26T12:00:00Z"

def test_repository_cleanliness():
    """Verify that backend/models/ remains clean and has no fake permanent checkpoint."""
    model_dir = os.path.join("backend", "models")
    if os.path.exists(model_dir):
        files = os.listdir(model_dir)
        assert "convgru_best.pt" not in files, "backend/models/convgru_best.pt should not exist until real Colab training"
        assert "normalization.json" not in files, "backend/models/normalization.json should not exist until real Colab training"
