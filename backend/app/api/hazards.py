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
    return {
        "event_id": event_id,
        "timestamp": state["timestamp"],
        "hazards": state["hazards"],
        "disclaimer": "All indicators are satellite/environmental proxies in the prototype version; direct Doppler radar velocity and lightning sensor networks required for production.",
        "badges": {
            "lightning": "YELLOW: PROTOTYPE / PROXY",
            "hail": "YELLOW: PROTOTYPE / PROXY",
            "downburst": "YELLOW: PROTOTYPE / PROXY",
            "cloudburst": "YELLOW: PROTOTYPE / PROXY"
        }
    }
