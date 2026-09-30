"""
Tests for Multi-Hazard Proxies, Risk Engine, and Arrival Countdown
"""
import pytest
from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service
from backend.app.services.hazards import hazard_service
from backend.app.services.risk import risk_engine
from backend.app.services.arrival import arrival_engine

def test_four_hazard_proxies():
    ts = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(ts[0])
    storms = detection_service.detect_storm_cells(frame)
    era5 = satellite_service.get_era5_context(ts[0])
    sensors = {"insat": "available", "era5": "available", "dwr": "unavailable", "lightning": "unavailable"}
    
    haz = hazard_service.evaluate_hazards(frame, storms, era5, sensors)
    
    assert "lightning" in haz
    assert "hail" in haz
    assert "downburst" in haz
    assert "cloudburst" in haz
    
    # Must contain honest provenance / scientific labels
    assert any(w in haz["lightning"]["scientific_label"].lower() for w in ["proxy", "glaciation", "insat"])
    assert any(w in haz["hail"]["scientific_label"].lower() for w in ["proxy", "verified", "hail", "radar"])
    assert any(w in haz["downburst"]["scientific_label"].lower() for w in ["proxy", "downburst", "thunderr", "gru"])
    assert any(w in haz["cloudburst"]["scientific_label"].lower() for w in ["proxy", "cloudburst", "verified", "imd"])
    assert "imd" in haz["cloudburst"]["scientific_label"].lower()

def test_arrival_countdown_and_risk():
    ts = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(ts[0])
    storms = detection_service.detect_storm_cells(frame)
    era5 = satellite_service.get_era5_context(ts[0])
    sensors = {"insat": "available", "era5": "available", "dwr": "unavailable", "lightning": "unavailable"}
    haz = hazard_service.evaluate_hazards(frame, storms, era5, sensors)
    
    arrivals = arrival_engine.compute_arrivals(storms, {}, sensors)
    assert len(arrivals) > 0
    assert "Paradeep Port & Coastal Belt" in arrivals
    
    risk = risk_engine.compute_risk(haz, storms, arrivals, sensors)
    assert 0.0 <= risk["overall_risk_score"] <= 100.0
    assert risk["risk_level"] in ["LOW", "MODERATE", "HIGH", "SEVERE"]
