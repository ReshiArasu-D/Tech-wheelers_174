"""
Tests for Convective Initiation, Storm Cell Detection, Tracking, and Lineage
"""
import pytest
from backend.app.services.satellite import satellite_service
from backend.app.services.detection import detection_service
from backend.app.services.tracking import tracking_service

def test_convective_initiation_scoring():
    ts = satellite_service.get_available_timestamps()
    f0 = satellite_service.read_frame(ts[0])
    f1 = satellite_service.read_frame(ts[1])
    era5 = satellite_service.get_era5_context(ts[1])
    
    ci = detection_service.compute_convective_initiation(f1, f0, era5)
    assert "ci_map" in ci
    assert ci["ci_map"].shape == f1["tb_kelvin"].shape
    assert 0.0 <= ci["mean_ci_score"] <= 1.0
    assert "Prototype CI" in ci["label"]

def test_storm_cell_detection():
    ts = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(ts[0])
    storms = detection_service.detect_storm_cells(frame)
    
    assert len(storms) > 0
    top_storm = storms[0]
    assert top_storm["storm_id"].startswith("STORM-")
    assert "centroid" in top_storm
    assert 10.0 <= top_storm["centroid"]["lat"] <= 24.0
    assert 80.0 <= top_storm["centroid"]["lon"] <= 94.0
    assert top_storm["area_km2"] >= 150.0
    assert top_storm["polygon_geojson"]["type"] == "Polygon"
    assert len(top_storm["polygon_geojson"]["coordinates"][0]) >= 3

def test_tracking_and_lineage():
    ts = satellite_service.get_available_timestamps()
    f0 = satellite_service.read_frame(ts[0])
    f1 = satellite_service.read_frame(ts[1])
    
    storms0 = detection_service.detect_storm_cells(f0)
    tracked0 = tracking_service.track_cells([], storms0, ts[0])
    
    storms1 = detection_service.detect_storm_cells(f1)
    tracked1 = tracking_service.track_cells(tracked0, storms1, ts[1])
    
    assert len(tracked1) > 0
    # At least some storms should continue persistently
    continued = [s for s in tracked1 if s["lineage_type"] == "CONTINUE"]
    assert len(continued) > 0
    assert len(tracking_service.lineage_records) > 0
