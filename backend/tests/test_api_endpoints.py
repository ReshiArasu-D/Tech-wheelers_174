"""
Tests for FastAPI HTTP Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "PROTOTYPE" in data["mode"]

def test_sensor_status_endpoint():
    res = client.get("/sensor-status")
    assert res.status_code == 200
    data = res.json()
    assert "sensors" in data
    assert data["sensors"]["insat"]["status"] == "available"
    assert data["sensors"]["dwr"]["status"] == "unavailable"

def test_events_endpoint():
    res = client.get("/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0
    assert events[0]["event_id"] == "EVENT-20191107-BOB-01"

def test_storms_endpoint():
    res = client.get("/storms")
    assert res.status_code == 200
    data = res.json()
    assert "storms" in data
    assert data["storm_count"] > 0

def test_predict_frame_post():
    payload = {
        "event_id": "EVENT-20191107-BOB-01",
        "timestamp": "2019-11-07T05:00:00Z",
        "model_override": "CONVGRU"
    }
    res = client.post("/predict/frame", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == "EVENT-20191107-BOB-01"
    assert "forecasts" in data
    assert "15m" in data["forecasts"]
    assert "hazards" in data

def test_alert_candidates_and_approval():
    # First ensure at least one prediction ran to populate alerts
    res_pred = client.post("/predict/frame", json={"event_id": "EVENT-20191107-BOB-01", "timestamp": "2019-11-07T05:00:00Z"})
    assert res_pred.status_code == 200
    
    res = client.get("/alerts")
    assert res.status_code == 200
    alerts = res.json()["alert_candidates"]
    
    if len(alerts) > 0:
        alert_id = alerts[0]["id"]
        res_app = client.post(f"/alerts/{alert_id}/approve", json={"operator_name": "Senior Meteorologist", "comments": "Approved test."})
        assert res_app.status_code == 200
        assert res_app.json()["status"] == "success"
