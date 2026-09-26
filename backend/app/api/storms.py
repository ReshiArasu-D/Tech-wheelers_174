"""
Storm Cells & Tracking API Endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.app.services.forecasting import forecasting_pipeline
from backend.app.services.tracking import tracking_service

router = APIRouter(tags=["Storms"])

@router.get("/storms")
def list_storms(timestamp: Optional[str] = Query(None)):
    state = forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
    return {
        "timestamp": state["timestamp"],
        "storm_count": len(state["storms"]),
        "storms": state["storms"],
        "lineage_records": tracking_service.lineage_records[-15:]
    }

@router.get("/storms/{storm_id}")
def get_storm_detail(storm_id: str, timestamp: Optional[str] = Query(None)):
    state = forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
    for s in state["storms"]:
        if s["storm_id"] == storm_id:
            # Find all lineage events involving this storm
            lineage = [
                rec for rec in tracking_service.lineage_records
                if rec["parent_id"] == storm_id or rec["child_id"] == storm_id
            ]
            return {
                "storm": s,
                "lineage": lineage,
                "timestamp": state["timestamp"]
            }
    raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found in frame {state['timestamp']}.")
