"""
Dynamic Reverse Geocoding Service
Resolves geographic area/place names from latitude and longitude coordinates
using the OpenStreetMap Nominatim service documented in osm_service_status.json.
No hardcoded coordinate-to-name dictionaries.
Returns 'UNAVAILABLE' if unresolved or offline.
"""
import urllib.request
import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)

_GEOCODE_CACHE: Dict[str, str] = {}


def reverse_geocode_osm(lat: float, lon: float, timeout_sec: float = 3.0) -> str:
    """
    Dynamically reverse-geocodes (lat, lon) to a human-readable area/place name
    via OpenStreetMap Nominatim. Results are cached in-memory.
    Returns 'UNAVAILABLE' on failure or empty response.
    """
    if lat is None or lon is None:
        return "UNAVAILABLE"

    # Cache key rounded to ~1 km precision
    cache_key = f"{round(float(lat), 2)},{round(float(lon), 2)}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=12"
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "CO-NOWCAST-SIH/1.0 (disaster-management-research)"}
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as res:
            data = json.loads(res.read().decode("utf-8"))
            addr = data.get("address", {})
            town = (
                addr.get("town") or
                addr.get("city") or
                addr.get("municipality") or
                addr.get("county") or
                addr.get("suburb") or
                addr.get("village") or
                addr.get("locality")
            )
            dist = addr.get("state_district") or addr.get("state")
            if town and dist:
                place_name = f"{town}, {dist}"
            elif town:
                place_name = town
            elif dist:
                place_name = dist
            else:
                place_name = data.get("name") or "UNAVAILABLE"

            _GEOCODE_CACHE[cache_key] = place_name
            return place_name
    except Exception as e:
        logger.debug(f"Reverse geocode failed for ({lat}, {lon}): {e}")
        _GEOCODE_CACHE[cache_key] = "UNAVAILABLE"
        return "UNAVAILABLE"
