"""
Events API Endpoints
"""
from fastapi import APIRouter, HTTPException
from backend.app.services.satellite import satellite_service

router = APIRouter(tags=["Events"])

EVENTS_CATALOG = [
    {
        "event_id": "EVENT-20191107-BOB-01",
        "name": "Severe Convective Storm / Bulbul System",
        "description": "Rapidly organizing deep convective system over Bay of Bengal and Eastern Coastal India (Odisha, West Bengal, and northern Andhra Pradesh)",
        "start_time": "2019-11-07T03:00:00Z",
        "end_time": "2019-11-07T07:00:00Z",
        "region_bbox": {
            "min_lat": 10.06,
            "max_lat": 24.01,
            "min_lon": 79.99,
            "max_lon": 93.94
        },
        "source": "INSAT-3D TIR1 L1B Standard HDF5",
        "sensor": "IMAGER (10.8 µm)",
        "resolution_km": 3.7,
        "classification": "REAL HISTORICAL SATELLITE REPLAY",
        "color_code": "GREEN"
    }
]

@router.get("/events")
def list_events():
    available_ts = satellite_service.get_available_timestamps()
    events = []
    for ev in EVENTS_CATALOG:
        ev_copy = dict(ev)
        ev_copy["timeline_timestamps"] = available_ts
        ev_copy["frame_count"] = len(available_ts)
        events.append(ev_copy)
    return events

@router.get("/events/{event_id}")
def get_event(event_id: str):
    for ev in EVENTS_CATALOG:
        if ev["event_id"] == event_id:
            available_ts = satellite_service.get_available_timestamps()
            ev_copy = dict(ev)
            ev_copy["timeline_timestamps"] = available_ts
            ev_copy["frame_count"] = len(available_ts)
            return ev_copy
    raise HTTPException(status_code=404, detail=f"Event {event_id} not found.")
