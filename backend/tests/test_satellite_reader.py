"""
Tests for INSAT-3D HDF5 Ingestion, Brightness Temperature (Tb), and Georeferencing
"""
import pytest
from backend.app.services.satellite import satellite_service

def test_available_timestamps():
    timestamps = satellite_service.get_available_timestamps()
    assert len(timestamps) > 0, "No historical INSAT-3D frames found"
    assert "2019-11-07T05:00:00Z" in timestamps

def test_read_frame_tb_extraction():
    timestamps = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(timestamps[0])
    
    assert "tb_kelvin" in frame
    tb = frame["tb_kelvin"]
    assert tb.ndim == 2
    # Verify realistic Brightness Temperature bounds
    assert frame["stats"]["min_tb_k"] >= 180.0
    assert frame["stats"]["max_tb_k"] <= 330.0
    # Convective storm event must have cold tops below 220 K
    assert frame["stats"]["min_tb_k"] < 210.0

def test_georeferencing_grid():
    timestamps = satellite_service.get_available_timestamps()
    frame = satellite_service.read_frame(timestamps[0])
    
    lat = frame["lat_grid"]
    lon = frame["lon_grid"]
    assert lat.shape == frame["tb_kelvin"].shape
    assert lon.shape == frame["tb_kelvin"].shape
    
    # Subcontinent region: 10N to 24N, 80E to 94E
    assert 10.0 <= frame["bounds"]["min_lat"] <= 12.0
    assert 22.0 <= frame["bounds"]["max_lat"] <= 25.0
    assert 79.0 <= frame["bounds"]["min_lon"] <= 81.0
    assert 93.0 <= frame["bounds"]["max_lon"] <= 95.0

def test_era5_context():
    context = satellite_service.get_era5_context("2019-11-07T05:00:00Z")
    assert context["status"] == "available"
    assert "cape_j_kg" in context["parameters"]
    assert context["parameters"]["cape_j_kg"]["mean"] > 1500.0
