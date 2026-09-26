"""
Alerts & Operational Sign-off API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
import datetime

from backend.app.schemas.storm_state import ApproveAlertRequest
from backend.app.services.forecasting import forecasting_pipeline
from backend.app.database import get_db, AlertModel, ApprovalModel, AuditLogModel

router = APIRouter(tags=["Alerts & Approval Workflow"])

@router.get("/alerts")
def list_alerts():
    return {
        "alert_candidates": forecasting_pipeline._active_alerts
    }

@router.post("/alerts/{id}/approve")
def approve_alert(id: str,
                  req: ApproveAlertRequest,
                  db: Session = Depends(get_db)):
    """
    Operational Human Sign-off Workflow:
    Meteorologist reviews alert candidate, verifies convective initiation
    and trajectory, and signs off before public dissemination.
    """
    try:
        updated_alert = forecasting_pipeline.approve_alert(
            alert_id=id,
            operator_name=req.operator_name,
            comments=req.comments
        )

        # Record in SQLite Audit Log
        audit_entry = AuditLogModel(
            action="ALERT_APPROVED",
            actor=req.operator_name,
            details=f"Alert {id} approved for {updated_alert.get('target_region')}. Comments: {req.comments}"
        )
        db.add(audit_entry)
        db.commit()

        return {
            "status": "success",
            "message": f"Alert {id} approved by human operator {req.operator_name}.",
            "alert": updated_alert,
            "dissemination_status": "READY_FOR_CAP_BROADCAST"
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alert candidate {id} not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
