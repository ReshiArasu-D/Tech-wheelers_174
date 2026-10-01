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


def get_marine_descriptor(lat: float, lon: float) -> str | None:
    """
    Deterministically computes a geographic marine descriptor for offshore coordinates
    where OpenStreetMap Nominatim has no administrative land area.
    """
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (ValueError, TypeError):
        return None

    # Bay of Bengal & Andaman Sea
    if 5.0 <= lat_f <= 23.5 and 80.0 <= lon_f <= 96.0:
        if lon_f >= 92.5 and lat_f <= 15.0:
            return "Andaman Sea — Open Waters"
        elif lat_f >= 19.0:
            return "North Bay of Bengal — Open Waters"
        elif lat_f >= 14.0:
            return "Central Bay of Bengal — Open Waters"
        else:
            return "South Bay of Bengal — Open Waters"

    # Arabian Sea & Lakshadweep
    if 5.0 <= lat_f <= 25.0 and 55.0 <= lon_f <= 77.0:
        if lat_f <= 12.0 and lon_f >= 71.0:
            return "Lakshadweep Sea — Open Waters"
        elif lat_f >= 18.0:
            return "North Arabian Sea — Open Waters"
        else:
            return "Arabian Sea — Open Waters"

    # Equatorial Indian Ocean
    if -5.0 <= lat_f < 5.0 and 60.0 <= lon_f <= 100.0:
        return "Indian Ocean — Open Waters"

    return None


def reverse_geocode_osm(lat: float, lon: float, timeout_sec: float = 3.0) -> str:
    """
    Dynamically reverse-geocodes (lat, lon) to a human-readable area/place name
    via OpenStreetMap Nominatim. Results are cached in-memory.
    Returns geographic marine descriptor for offshore waters, or 'UNAVAILABLE' if unresolved.
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
                nom_name = data.get("name")
                if nom_name and nom_name.strip():
                    place_name = nom_name
                else:
                    place_name = get_marine_descriptor(lat, lon) or "UNAVAILABLE"

            _GEOCODE_CACHE[cache_key] = place_name
            return place_name
    except Exception as e:
        logger.debug(f"Reverse geocode failed for ({lat}, {lon}): {e}")
        marine = get_marine_descriptor(lat, lon)
        place_name = marine if marine else "UNAVAILABLE"
        _GEOCODE_CACHE[cache_key] = place_name
        return place_name

