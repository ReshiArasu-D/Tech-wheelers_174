"""
Tests for Generative Intelligence Layer Endpoints (/ai/summary and /ai/chat)
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_ai_summary_endpoint():
    payload = {
        "event_id": "EVENT-20191107-BOB-01",
        "timestamp": "2019-11-07T05:00:00Z",
        "selected_horizon": "NOW",
        "selected_model": "CONVGRU"
    }
    res = client.post("/ai/summary", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "sections" in data
    assert len(data["sections"]) >= 6
    
    # Verify required operational section headings
    section_titles = [s["title"] for s in data["sections"]]
    assert any("Current Situation" in t for t in section_titles)
    assert any("Main Hazards" in t for t in section_titles)
    assert any("Near-term Outlook" in t for t in section_titles)
    assert any("6-Hour Outlook" in t for t in section_titles)
    assert any("Risk / Arrival" in t for t in section_titles)
    assert any("Recommended Operator Attention" in t for t in section_titles)
    assert "scientific_disclaimer" in data

def test_ai_chat_dominant_threat():
    payload = {
        "message": "What is the main threat right now?",
        "event_id": "EVENT-20191107-BOB-01",
        "timestamp": "2019-11-07T05:00:00Z",
        "selected_horizon": "NOW"
    }
    res = client.post("/ai/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "Dominant Threat" in data["reply"] or "threat" in data["reply"].lower()
    assert "suggested_questions" in data
    assert len(data["suggested_questions"]) > 0

def test_ai_chat_arrival_countdown():
    payload = {
        "message": "When is the expected arrival for coastal ports?",
        "event_id": "EVENT-20191107-BOB-01",
        "timestamp": "2019-11-07T05:00:00Z",
        "selected_horizon": "30m"
    }
    res = client.post("/ai/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    reply_lower = data["reply"].lower()
    assert "arrival" in reply_lower or "countdown" in reply_lower or "impact" in reply_lower
