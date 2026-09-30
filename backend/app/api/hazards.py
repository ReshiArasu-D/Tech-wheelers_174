"""
Hazards API Endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.app.services.forecasting import forecasting_pipeline

router = APIRouter(tags=["Hazards"])

@router.get("/hazards/{event_id}")
def get_hazards(event_id: str, timestamp: Optional[str] = Query(None)):
    state = forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
    hazards = state.get("hazards", {})
    return {
        "event_id": event_id,
        "timestamp": state["timestamp"],
        "hazards": hazards,
        "disclaimer": "Operational multi-hazard convective assessment powered by trained radar ConvGRU, multimodal atmosphere models, and physical proxies.",
        "badges": {
            k: v.get("model_status", "ACTIVE") for k, v in hazards.items()
        }
    }
