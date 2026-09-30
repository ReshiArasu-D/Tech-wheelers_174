"""
Tests for Optical Flow, ConvGRU Residual Inference, and Uncertainty
"""
import pytest
import numpy as np
from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service
from backend.app.models.optical_flow import optical_flow_model
from backend.app.models.convgru import convgru_nowcaster
from backend.app.models.uncertainty import uncertainty_engine

def test_optical_flow_motion():
    ts = satellite_service.get_available_timestamps()
    f0 = satellite_service.read_frame(ts[0])
    f1 = satellite_service.read_frame(ts[1])
    
    flow = optical_flow_model.compute_dense_flow(f0["convective_intensity"], f1["convective_intensity"])
    assert flow.shape == (f0["convective_intensity"].shape[0], f0["convective_intensity"].shape[1], 2)
    
    storms1 = detection_service.detect_storm_cells(f1)
    motion = optical_flow_model.compute_storm_motion(flow, storms1[0], f1["convective_intensity"].shape)
    assert "u" in motion
    assert "v" in motion
    assert "speed_kmh" in motion
    assert 0.0 <= motion["direction_deg"] <= 360.0

def test_convgru_residual_inference_untrained_fails_safely(tmp_path):
    """Verify that when no checkpoint is present, ConvGRU refuses random weights and reports untrained."""
    from backend.app.services.model_loader import ModelLoaderService
    empty_loader = ModelLoaderService(model_dir=str(tmp_path))
    assert not empty_loader.is_trained
    assert empty_loader.status == "not_trained"
    
    ts = satellite_service.get_available_timestamps()
    f0 = satellite_service.read_frame(ts[0])
    f1 = satellite_service.read_frame(ts[1])
    flow = optical_flow_model.compute_dense_flow(f0["convective_intensity"], f1["convective_intensity"])
    
    # Must raise RuntimeError rather than silently using random weights
    with pytest.raises(RuntimeError, match="TRAINED MODEL NOT AVAILABLE"):
        empty_loader.predict_residual(f0["convective_intensity"], f1["convective_intensity"], flow)

    # Active singleton must be trained if checkpoint is present
    if convgru_nowcaster.is_trained:
        res = convgru_nowcaster.predict_residual(f0["convective_intensity"], f1["convective_intensity"], flow)
        assert res.shape == f0["convective_intensity"].shape

def test_multi_horizon_forecasting():
    ts = satellite_service.get_available_timestamps()
    f0 = satellite_service.read_frame(ts[0])
    f1 = satellite_service.read_frame(ts[1])
    flow = optical_flow_model.compute_dense_flow(f0["convective_intensity"], f1["convective_intensity"])
    storms = detection_service.detect_storm_cells(f1)
    era5 = satellite_service.get_era5_context(ts[1])
    
    forecasts = convgru_nowcaster.generate_horizon_forecasts(f1, f0, flow, storms, era5)
    for hz in ["15m", "30m", "60m", "180m", "360m"]:
        assert hz in forecasts
        assert forecasts[hz]["confidence"] > 0.0
        assert forecasts[hz]["uncertainty_score"] > 0.0
        
    # Uncertainty must monotonically increase with lead time
    assert forecasts["15m"]["uncertainty_score"] < forecasts["60m"]["uncertainty_score"]
    assert forecasts["60m"]["uncertainty_score"] < forecasts["360m"]["uncertainty_score"]

def test_uncertainty_temperature_scaling_and_conformal():
    prob = uncertainty_engine.calibrate_probability(0.85, 30, {"dwr": "unavailable", "lightning": "unavailable"})
    assert 0.05 <= prob <= 0.95
    
    # Missing sensors increase interval width
    int_full = uncertainty_engine.compute_conformal_interval(0.70, 30, {"dwr": "available", "lightning": "available"})
    int_degraded = uncertainty_engine.compute_conformal_interval(0.70, 30, {"dwr": "unavailable", "lightning": "unavailable"})
    assert int_degraded["interval_width"] > int_full["interval_width"]
