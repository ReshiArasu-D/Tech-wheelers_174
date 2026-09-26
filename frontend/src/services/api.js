const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => fetch(`${API_BASE}/health`).then(handleResponse),
  getSensorStatus: () => fetch(`${API_BASE}/sensor-status`).then(handleResponse),
  getModelInfo: () => fetch(`${API_BASE}/model-info`).then(handleResponse),
  getEvents: () => fetch(`${API_BASE}/events`).then(handleResponse),
  getEvent: (eventId) => fetch(`${API_BASE}/events/${eventId}`).then(handleResponse),
  getStorms: (timestamp) => {
    const url = timestamp ? `${API_BASE}/storms?timestamp=${encodeURIComponent(timestamp)}` : `${API_BASE}/storms`;
    return fetch(url).then(handleResponse);
  },
  getForecast: (eventId, timestamp, model = 'CONVGRU') => {
    let url = `${API_BASE}/forecast/${eventId}?model=${model}`;
    if (timestamp) url += `&timestamp=${encodeURIComponent(timestamp)}`;
    return fetch(url).then(handleResponse);
  },
  getHazards: (eventId, timestamp) => {
    const url = timestamp ? `${API_BASE}/hazards/${eventId}?timestamp=${encodeURIComponent(timestamp)}` : `${API_BASE}/hazards/${eventId}`;
    return fetch(url).then(handleResponse);
  },
  getRisk: (eventId, timestamp) => {
    const url = timestamp ? `${API_BASE}/risk/${eventId}?timestamp=${encodeURIComponent(timestamp)}` : `${API_BASE}/risk/${eventId}`;
    return fetch(url).then(handleResponse);
  },
  getArrival: (eventId, timestamp) => {
    const url = timestamp ? `${API_BASE}/arrival/${eventId}?timestamp=${encodeURIComponent(timestamp)}` : `${API_BASE}/arrival/${eventId}`;
    return fetch(url).then(handleResponse);
  },
  predictFrame: (eventId, timestamp, sensorOverride = null, modelOverride = 'CONVGRU') => {
    return fetch(`${API_BASE}/predict/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        timestamp: timestamp,
        sensor_override: sensorOverride,
        model_override: modelOverride
      })
    }).then(handleResponse);
  },
  getAlerts: () => fetch(`${API_BASE}/alerts`).then(handleResponse),
  approveAlert: (alertId, operatorName, comments) => {
    return fetch(`${API_BASE}/alerts/${alertId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator_name: operatorName || 'Chief Duty Meteorologist',
        comments: comments || 'Verified convective initiation signatures and corridor trajectory.'
      })
    }).then(handleResponse);
  }
};
