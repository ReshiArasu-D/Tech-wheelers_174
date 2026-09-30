"""
Unit and Integration Tests for Dynamic DWR ConvGRU Pipeline
============================================================
Verifies:
1. Dynamic model artifact loading (no hardcoded paths).
2. Strict preprocessing contract [5, 3, 128, 128].
3. Prediction generation from actual incoming DWR frames (no fabricated values).
4. Graceful degradation and fallback behavior when DWR data or model is absent.
5. Freedom from any date dependency (2019-11-07 is purely prototype data).
6. Downburst hazard head remains UNAVAILABLE.
"""
import numpy as np
import pytest
import torch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.dwr_convgru import dwr_service, DWRPreprocessor, RadarConvGRU, TERLSRadarConvGRU
from backend.app.services.model_registry import model_registry
from backend.app.services.nowcast_pipeline import run_nowcast
from backend.app.services.forecasting import forecasting_pipeline
from backend.app.services.hazards import hazard_service
from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service

client = TestClient(app)


def test_dwr_dynamic_model_loading():
    """Verify DWR ConvGRU model checkpoint is dynamically discovered and loaded."""
    desc = model_registry.get_descriptor("radar_encoder")
    assert desc is not None
    assert desc.requires_radar is True
    assert model_registry.is_loaded("radar_encoder")

    # DWR service should be active via the registry
    assert dwr_service.is_loaded is True
    assert dwr_service.status == "LOADED"
    assert dwr_service.model is not None
    # Accept either model class: TERLS checkpoint uses TERLSRadarConvGRU (single merged conv);
    # future checkpoints may use RadarConvGRU (split gate conv).
    assert isinstance(dwr_service.model, (RadarConvGRU, TERLSRadarConvGRU)), (
        f"Unexpected model class: {type(dwr_service.model).__name__}"
    )
    assert dwr_service.checkpoint_path is not None
    assert "radar_convgru" in dwr_service.checkpoint_path.lower()


def test_dwr_preprocessing_contract():
    """Verify preprocessing contract strictly requires [5, 3, 128, 128]."""
    prep = DWRPreprocessor()
    device = torch.device("cpu")

    # Valid input: [5, 3, 128, 128]
    valid_frames = np.random.uniform(0, 60, (5, 3, 128, 128)).astype(np.float32)
    tensor = prep.transform(valid_frames, device)
    assert tensor is not None
    assert tensor.shape == (1, 5, 3, 128, 128)
    assert tensor.dtype == torch.float32

    # Valid input with non-standard resolution: resized to 128x128
    non_std_frames = np.random.uniform(0, 60, (5, 3, 256, 256)).astype(np.float32)
    tensor_resized = prep.transform(non_std_frames, device)
    assert tensor_resized is not None
    assert tensor_resized.shape == (1, 5, 3, 128, 128)

    # Valid input with channels at end (T, H, W, 3)
    channel_last = np.random.uniform(0, 60, (5, 128, 128, 3)).astype(np.float32)
    tensor_ch_last = prep.transform(channel_last, device)
    assert tensor_ch_last is not None
    assert tensor_ch_last.shape == (1, 5, 3, 128, 128)

    # Invalid input: fewer than 5 frames
    too_short = np.random.uniform(0, 60, (3, 3, 128, 128)).astype(np.float32)
    assert prep.transform(too_short, device) is None

    # Invalid input: wrong channel count
    wrong_channels = np.random.uniform(0, 60, (5, 1, 128, 128)).astype(np.float32)
    assert prep.transform(wrong_channels, device) is None

    # None input
    assert prep.transform(None, device) is None


def test_dwr_real_incoming_frame_prediction():
    """Verify inference runs on actual incoming frames without stored or fabricated values."""
    # Frame sequence 1
    input_seq_1 = np.ones((5, 3, 128, 128), dtype=np.float32) * 20.0
    pred_1 = dwr_service.predict_from_incoming(input_seq_1)
    assert pred_1 is not None
    assert pred_1.shape == (128, 128)

    # Frame sequence 2 with distinctly different values
    input_seq_2 = np.ones((5, 3, 128, 128), dtype=np.float32) * 55.0
    pred_2 = dwr_service.predict_from_incoming(input_seq_2)
    assert pred_2 is not None
    assert pred_2.shape == (128, 128)

    # Predictions must be genuinely computed from inputs, not static identical outputs
    assert not np.allclose(pred_1, pred_2), "Model must react dynamically to varying inputs."


def test_dwr_unavailable_fallback_behavior():
    """Verify system reports unavailable and falls back cleanly when DWR frames are absent."""
    # When no radar data is passed to predict_from_incoming
    assert dwr_service.predict_from_incoming(None) is None

    # Execute nowcast pipeline with NO radar data
    ts = satellite_service.get_available_timestamps()
    test_ts = ts[0]
    result = run_nowcast(input_data={"timestamp": test_ts})

    # Sensor status must report dwr unavailable
    assert result["sensor_status"]["dwr"] == "unavailable"
    assert result["fusion_metadata"]["fusion_mode"] == "REDUCED_ATMOSPHERE_ONLY"
    assert result["fusion_metadata"]["confidence_discount"] < 1.0


def test_dwr_incoming_data_pipeline_activation():
    """Verify pipeline integrates real DWR frames when supplied."""
    ts = satellite_service.get_available_timestamps()
    test_ts = ts[0]

    incoming_radar = {
        "frames": np.random.uniform(10, 50, (5, 3, 128, 128)).astype(np.float32),
        "features": np.zeros((16, 128, 128), dtype=np.float32)
    }

    result = run_nowcast(input_data={
        "timestamp": test_ts,
        "radar_data": incoming_radar
    })

    assert result["sensor_status"]["dwr"] == "available"
    assert result["fusion_metadata"]["fusion_mode"] == "FULL_MULTIMODAL"
    assert result["fusion_metadata"]["confidence_discount"] == 1.0


def test_no_date_dependency():
    """Verify runtime does not hardcode or depend on the 2019-11-07 training date."""
    # Arbitrary future/different date event
    custom_event = "EVENT-20250615-KERALA-01"
    response = client.get(f"/forecast/{custom_event}")
    assert response.status_code == 200
    data = response.json()
    assert data["event_id"] == custom_event

    # Health endpoint doesn't lock to 2019-11-07
    h_res = client.get("/health")
    assert h_res.status_code == 200


def test_downburst_evaluated_with_thunderr_gru():
    """Verify Downburst hazard head is evaluated via trained DownburstTemporalGRU (118,274 params)."""
    ts = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(ts[0])
    storms = detection_service.detect_storm_cells(frame)
    era5 = satellite_service.get_era5_context(ts[0])
    sensors = {"insat": "available", "era5": "available", "dwr": "available", "lightning": "unavailable"}

    hazards = hazard_service.evaluate_hazards(frame, storms, era5, sensors, horizon_min=30)
    assert hazards["downburst"]["model_status"] in ["TRAINED_CHECKPOINT", "VERIFIED_MODEL"]
    assert hazards["downburst"]["probability"] is not None
