"""
End-to-End Integration Verification Tests for SIH 26084:
Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)
"""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.model_registry import model_registry
from backend.app.services.hazards import hazard_service
from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service
from backend.app.services.nowcast_pipeline import run_nowcast
from backend.app.services.forecasting import forecasting_pipeline

client = TestClient(app)


def test_model_registry_architecture():
    """Verify Model Registry manages all checkpoints cleanly."""
    summary = model_registry.get_registry_summary()
    assert summary["total_models"] >= 9
    assert summary["loaded_count"] >= 8  # all active models and verified hazard heads

    # Check radar, atmosphere, and hazards are loaded
    assert model_registry.is_loaded("radar_encoder")
    assert model_registry.is_loaded("atmosphere_encoder")
    assert model_registry.is_loaded("hazard_downburst")
    assert model_registry.is_loaded("hazard_heavy_rain")
    assert model_registry.is_loaded("hazard_thunderstorm")
    assert model_registry.is_loaded("hazard_hail")
    assert model_registry.is_loaded("hazard_cloudburst")
    assert model_registry.is_loaded("hazard_lightning")


def test_all_six_hazards_unified_schema():
    """Verify all 6 hazard heads follow consistent output schema."""
    ts = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(ts[0])
    storms = detection_service.detect_storm_cells(frame)
    era5 = satellite_service.get_era5_context(ts[0])
    sensors = {"insat": "available", "era5": "available", "dwr": "unavailable", "lightning": "unavailable"}

    hazards = hazard_service.evaluate_hazards(frame, storms, era5, sensors, horizon_min=30)

    expected_hazards = ["lightning", "thunderstorm", "hail", "heavy_rain", "cloudburst", "downburst"]
    for h in expected_hazards:
        assert h in hazards, f"Missing hazard head: {h}"
        h_data = hazards[h]
        assert "hazard_type" in h_data
        assert "severity" in h_data
        assert "confidence" in h_data
        assert "uncertainty" in h_data
        assert "horizon_minutes" in h_data
        assert "spatial_field" in h_data
        assert "model_status" in h_data
        assert "scientific_basis" in h_data
        assert "provenance" in h_data

    # Downburst is verified via DownburstTemporalGRU (118,274 params)
    assert hazards["downburst"]["model_status"] in ["TRAINED_CHECKPOINT", "VERIFIED_MODEL"]
    assert hazards["downburst"]["probability"] is not None


def test_sensor_status_five_sensors():
    """Verify sensor-status API returns all 5 sensors."""
    response = client.get("/sensor-status")
    assert response.status_code == 200
    data = response.json()
    sensors = data["sensors"]

    assert "insat" in sensors
    assert "era5" in sensors
    assert "imerg" in sensors
    assert "dwr" in sensors
    assert "lightning" in sensors

    # Verify prototype truth: DWR and Lightning are unavailable
    assert sensors["dwr"]["display_status"] == "UNAVAILABLE"
    assert sensors["lightning"]["display_status"] == "UNAVAILABLE"


def test_alert_candidate_approval_and_rejection():
    """Verify human-in-the-loop approval and rejection workflows."""
    forecasting_pipeline._active_alerts.clear()
    state = forecasting_pipeline.run_pipeline_for_frame()
    candidates = state.get("alert_candidates", [])
    if not candidates:
        pytest.skip("No alert candidates generated for test frame.")

    first_cand = candidates[0]
    alert_id = first_cand["id"]

    # Verify required candidate schema fields
    assert "hazard_types" in first_cand
    assert "severity" in first_cand
    assert "probability" in first_cand
    assert "confidence" in first_cand
    assert "uncertainty" in first_cand
    assert "countdown" in first_cand
    assert "affected_area_km2" in first_cand
    assert "exposure" in first_cand
    assert "evidence_provenance" in first_cand
    assert first_cand["status"] == "CANDIDATE"

    # Test Rejection Workflow
    rej_resp = client.post(f"/alerts/{alert_id}/reject", json={
        "operator_name": "Test Duty Meteorologist",
        "reason": "Test false alarm rejection."
    })
    assert rej_resp.status_code == 200
    rej_data = rej_resp.json()
    assert rej_data["status"] == "success"
    assert rej_data["alert"]["status"] == "REJECTED"
    assert rej_data["dissemination_status"] == "STAND_DOWN"

    # Test Approval Workflow
    app_resp = client.post(f"/alerts/{alert_id}/approve", json={
        "operator_name": "Test Duty Meteorologist",
        "comments": "Test manual verification passed."
    })
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    assert app_data["status"] == "success"
    assert app_data["alert"]["status"] == "APPROVED"
    assert app_data["dissemination_status"] == "READY_FOR_CAP_BROADCAST"


def test_long_horizon_dispersion_corridors():
    """Verify +180m and +360m are generated as probabilistic dispersion corridors."""
    state = forecasting_pipeline.run_pipeline_for_frame()
    forecasts = state.get("forecasts", {})

    assert "180m" in forecasts
    assert "360m" in forecasts

    f180 = forecasts["180m"]
    f360 = forecasts["360m"]

    assert f180["type"] == "PROBABILISTIC_CORRIDOR"
    assert f360["type"] == "PROBABILISTIC_CORRIDOR"
    assert "corridors" in f180
    assert "corridors" in f360
    assert f180["uncertainty_score"] < f360["uncertainty_score"]  # Uncertainty grows with horizon


def test_run_nowcast_single_entry_point():
    """Verify single end-to-end nowcast pipeline entry point executes cleanly."""
    result = run_nowcast({"model_override": "CONVGRU"})
    assert result is not None
    assert result["event_id"] == "EVENT-20191107-BOB-01"
    assert "storms" in result
    assert "forecasts" in result
    assert "hazards" in result
    assert len(result["hazards"]) == 6
    assert "uncertainty" in result
    assert "risk" in result
    assert "arrival" in result
    assert "alert_candidates" in result
    assert result["latency_ms"] > 0.0
