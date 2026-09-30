"""
Pydantic Schemas for Storm State and API Contracts
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SensorStatusSchema(BaseModel):
    insat: str = "available"
    era5: str = "available"
    dwr: str = "unavailable"
    lightning: str = "unavailable"
    radar_coverage_gap: bool = True
    overall_confidence_discount: float = 0.75
    mode_label: str = "PROTOTYPE: INSAT + ERA5 REDUCED SENSOR FUSION"

class CentroidSchema(BaseModel):
    lat: float
    lon: float

class MotionSchema(BaseModel):
    u: float # km/h zonal
    v: float # km/h meridional
    speed_kmh: float
    direction_deg: float

class StormCellSchema(BaseModel):
    storm_id: str
    timestamp: str
    centroid: CentroidSchema
    area_km2: float
    intensity: float # 0.0 - 1.0 convective index
    min_tb_k: float
    mean_tb_k: float
    cooling_rate_k_hr: Optional[float] = None
    motion: MotionSchema
    polygon_geojson: Dict[str, Any]
    lineage_parents: List[str] = []
    lineage_type: str = "CONTINUE" # CONTINUE, MERGE, SPLIT

class HorizonForecastSchema(BaseModel):
    horizon_minutes: int
    target_timestamp: str
    type: str # "FINE_STORM_SCALE" for 15/30/60m, "PROBABILISTIC_CORRIDOR" for 180/360m
    confidence: float # 0.0 - 1.0
    uncertainty_score: float # 0.0 - 1.0 (increases with horizon)
    conformal_interval: Dict[str, float] # {"lower": float, "upper": float}
    storm_polygons: List[Dict[str, Any]]
    probabilistic_contours: Optional[List[Dict[str, Any]]] = None
    corridors: Optional[List[Dict[str, Any]]] = None

class SingleHazardSchema(BaseModel):
    hazard_type: str
    severity: str # "NONE", "LOW", "MODERATE", "HIGH", "SEVERE", "UNAVAILABLE"
    probability: Optional[float] = None  # None for UNAVAILABLE hazards (e.g. Downburst)
    confidence: Optional[str] = None
    uncertainty: Optional[float] = None
    horizon_minutes: Optional[int] = None
    name: Optional[str] = None
    proxy_indicator: Optional[str] = None
    scientific_label: Optional[str] = None
    scientific_basis: Optional[str] = None
    provenance: Optional[str] = None
    model_status: Optional[str] = None
    spatial_field: Optional[Dict[str, Any]] = None
    # Legacy fields
    affected_area_km2: Optional[float] = None
    grid_geojson: Optional[Dict[str, Any]] = None

    model_config = {"extra": "allow"}  # allow extra fields from service

class MultiHazardSchema(BaseModel):
    lightning: SingleHazardSchema
    thunderstorm: Optional[SingleHazardSchema] = None
    hail: SingleHazardSchema
    heavy_rain: Optional[SingleHazardSchema] = None
    cloudburst: SingleHazardSchema
    downburst: SingleHazardSchema

class UncertaintyMetricsSchema(BaseModel):
    calibration_method: str = "Temperature Scaling & Conformal Prediction Intervals"
    sensor_dropout_impact: float = 0.25 # extra uncertainty due to absent DWR/Lightning
    horizon_uncertainty: Dict[str, float] = {
        "15m": 0.12,
        "30m": 0.24,
        "60m": 0.42,
        "180m": 0.68,
        "360m": 0.85
    }
    is_fully_calibrated: bool = False
    scientific_disclaimer: str = "Uncertainty intervals computed via conformal residual residuals over historical INSAT event; operational field validation pending."

class TargetArrivalSchema(BaseModel):
    target_name: str
    lat: float
    lon: float
    estimated_arrival_minutes: Optional[float] = None
    countdown_display: str # "00:42:18" or "NO IMPACT"
    impact_probability: float
    confidence: str # "LOW", "MEDIUM", "HIGH"
    hazard_types: List[str]

class RiskAssessmentSchema(BaseModel):
    overall_risk_score: float # 0 to 100
    risk_level: str # "LOW", "MODERATE", "HIGH", "SEVERE"
    population_exposure_index: float
    critical_infrastructure_risk: str
    persistence_factor: float
    primary_threat: str

class AlertCandidateSchema(BaseModel):
    id: str
    event_id: str
    timestamp: str
    target_region: str
    severity: str
    hazard_types: List[str]
    risk_score: float
    countdown: str
    confidence: str
    status: str # "CANDIDATE", "APPROVED", "DISSEMINATED", "REJECTED"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None

class StormStateSchema(BaseModel):
    event_id: str
    timestamp: str
    model_version: str = "convnowcast-v0.1"
    provenance_badge: Dict[str, str] = {
        "prototype": "INSAT + ERA5 Historical Replay",
        "production": "DWR + INSAT + Lightning + ERA5",
        "model": "ConvGRU + Optical Flow Advection",
        "version": "convnowcast-v0.1",
        "grid_resolution": "3.7 km native INSAT / 1.0 km radar-anchored target"
    }
    sensor_status: SensorStatusSchema
    storms: List[StormCellSchema]
    forecasts: Dict[str, HorizonForecastSchema]
    hazards: MultiHazardSchema
    uncertainty: UncertaintyMetricsSchema
    risk: RiskAssessmentSchema
    arrival: Dict[str, TargetArrivalSchema]
    alert_candidates: List[AlertCandidateSchema] = []

class PredictFrameRequest(BaseModel):
    event_id: str
    timestamp: str
    sensor_override: Optional[Dict[str, str]] = None
    model_override: Optional[str] = "CONVGRU" # PERSISTENCE, OPTICAL_FLOW, CONVGRU
    radar_data: Optional[Dict[str, Any]] = None

class ApproveAlertRequest(BaseModel):
    operator_name: str = "Chief Duty Meteorologist"
    comments: Optional[str] = "Alert verified against convective cell intensification and trajectory corridor."

class RejectAlertRequest(BaseModel):
    operator_name: str = "Chief Duty Meteorologist"
    reason: Optional[str] = "Operator rejected: convective dissipation or false alarm signature."
