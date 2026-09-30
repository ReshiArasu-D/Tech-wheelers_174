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
        "production_specification": "DWR + INSAT + Lightning + ERA5 Multimodal Fusion",
        "sensor_status": {
            "insat": "available",
            "era5": "available",
            "dwr": "unavailable",
            "lightning": "unavailable",
            "radar_coverage_gap": True,
            "overall_confidence_discount": 0.25,
            "mode_label": "PROTOTYPE: INSAT + ERA5 REDUCED SENSOR FUSION"
        }
    }

from backend.app.services.model_loader import model_loader_service
from backend.app.services.model_registry import model_registry
from backend.app.models.dwr_convgru import dwr_service

@router.get("/sensor-status")
def get_sensor_status():
    return {
        "sensors": {
            "insat": {
                "name": "INSAT-3D / INSAT-3DR Imager",
                "status": "available",
                "display_status": "REPLAY",
                "channel": "TIR1 (10.8 µm)",
                "cadence": "30 minutes (interpolated 15 min)",
                "native_resolution": "3.7 km",
                "quality": "NOMINAL",
                "provenance": "Real INSAT HDF5 Replay (07-Nov-2019 Bay of Bengal Severe Event)"
            },
            "era5": {
                "name": "ERA5 Atmospheric Reanalysis",
                "status": "available",
                "display_status": "CONNECTED",
                "parameters": ["CAPE", "CIN", "Precipitable Water", "0-6km Bulk Shear"],
                "native_resolution": "0.25 deg (~28 km)",
                "quality": "NOMINAL",
                "provenance": "ECMWF ERA5 Reanalysis Context"
            },
            "imerg": {
                "name": "GPM IMERG Early Precipitation",
                "status": "PARTIAL",
                "display_status": "PARTIAL",
                "parameters": ["Surface Rainfall Accumulation", "Precipitation Calibrated Rate"],
                "native_resolution": "0.1 deg (~10 km)",
                "quality": "NOMINAL",
                "provenance": "GPM IMERG Half-Hourly Gridded Proxy"
            },
            "dwr": {
                "name": "Doppler Weather Radar (IMD S-Band / C-Band)",
                "status": "unavailable",
                "display_status": "UNAVAILABLE",
                "note": "Required for production 1-3 km radar-anchored grid, Doppler radial velocity, and reflectivity cores",
                "prototype_handling": "Degraded mode active; fallback to satellite-derived convective proxies",
                "provenance": "Awaiting Indian DWR dataset ingestion from Google Colab"
            },
            "lightning": {
                "name": "Ground Lightning Network (LLDN)",
                "status": "unavailable",
                "display_status": "UNAVAILABLE",
                "note": "Direct ground flash strike density network unavailable in prototype",
                "prototype_handling": "Mixed-phase cloud glaciation & convective cooling proxy active",
                "provenance": "Awaiting ground strike sensor feed"
            }
        },
        "radar_coverage_gap": True,
        "overall_confidence_discount": 0.25,
        "provenance_badge": "YELLOW: PROTOTYPE / PROXY REDUCED SENSOR FUSION"
    }

@router.get("/model-info")
def get_model_info():
    """Returns model status, checkpoint, metadata, device information, and model registry summary."""
    info = model_loader_service.get_model_info()
    info["dwr_service"] = dwr_service.get_status_info()
    info["registry"] = model_registry.get_registry_summary()
    return info
