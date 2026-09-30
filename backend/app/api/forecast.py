"""
Forecast, Risk & Arrival API Endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict
from backend.app.services.forecasting import forecasting_pipeline
from backend.app.schemas.storm_state import PredictFrameRequest, StormStateSchema

router = APIRouter(tags=["Forecast & Prediction"])

@router.get("/forecast/{event_id}")
def get_forecast(event_id: str,
                 timestamp: Optional[str] = Query(None),
                 model: Optional[str] = Query("CONVGRU")):
    state = forecasting_pipeline.run_pipeline_for_frame(
        timestamp=timestamp,
        model_override=model,
        event_id=event_id
    )
    return {
        "event_id": event_id,
        "timestamp": state["timestamp"],
        "model_used": model,
        "forecasts": state["forecasts"],
        "provenance_badge": state["provenance_badge"],
        "sensor_status": state["sensor_status"]
    }

@router.post("/predict/frame")
def predict_frame(request: PredictFrameRequest):
    """
    Executes the full pipeline for a selected historical timestamp,
    honoring sensor dropout overrides and model selection.
    """
    state = forecasting_pipeline.run_pipeline_for_frame(
        timestamp=request.timestamp,
        sensor_override=request.sensor_override,
        model_override=request.model_override,
        radar_data=request.radar_data,
        event_id=request.event_id
    )
    return state

@router.get("/risk/{event_id}")
def get_risk(event_id: str, timestamp: Optional[str] = Query(None)):
    state = forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
    return {
        "event_id": event_id,
        "timestamp": state["timestamp"],
        "risk": state["risk"]
    }

@router.get("/arrival/{event_id}")
def get_arrival(event_id: str, timestamp: Optional[str] = Query(None)):
    state = forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
    return {
        "event_id": event_id,
        "timestamp": state["timestamp"],
        "arrival": state["arrival"]
    }
