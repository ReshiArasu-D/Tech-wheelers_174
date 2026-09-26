"""
Health & Diagnostic API Endpoints
"""
from fastapi import APIRouter
import datetime

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "CO-NOWCAST Convective Scale Nowcasting Engine",
        "system_time": datetime.datetime.utcnow().isoformat() + "Z",
        "mode": "PROTOTYPE: INSAT-3D + ERA5 REDUCED SENSOR FUSION",
        "production_specification": "DWR + INSAT + Lightning + ERA5 Multimodal Fusion"
    }

@router.get("/sensor-status")
def get_sensor_status():
    return {
        "sensors": {
            "insat": {
                "name": "INSAT-3D / INSAT-3DR Imager",
                "status": "available",
                "channel": "TIR1 (10.8 µm)",
                "cadence": "30 minutes (interpolated 15 min)",
                "native_resolution": "3.7 km",
                "quality": "NOMINAL"
            },
            "era5": {
                "name": "ERA5 Reanalysis (ECMWF)",
                "status": "available",
                "parameters": ["CAPE", "CIN", "Precipitable Water", "0-6km Shear"],
                "native_resolution": "0.25 deg (~28 km)",
                "quality": "NOMINAL"
            },
            "dwr": {
                "name": "Doppler Weather Radar (IMD S-Band / C-Band)",
                "status": "unavailable",
                "note": "Required for production 1-3 km radar-anchored grid, Doppler radial velocity, and reflectivity cores",
                "prototype_handling": "Degraded mode active; fallback to satellite-derived proxies"
            },
            "lightning": {
                "name": "Ground Lightning Detection Network (LLDN)",
                "status": "unavailable",
                "note": "Direct flash rate/density unavailable in prototype",
                "prototype_handling": "Convective intensity & vertical cooling proxy active"
            }
        },
        "radar_coverage_gap": True,
        "overall_confidence_discount": 0.25,
        "provenance_badge": "YELLOW: PROTOTYPE / PROXY REDUCED SENSOR FUSION"
    }

from backend.app.services.model_loader import model_loader_service

@router.get("/model-info")
def get_model_info():
    """Returns model status, checkpoint, metadata, and device information."""
    return model_loader_service.get_model_info()
