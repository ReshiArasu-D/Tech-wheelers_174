import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GisMap({
  storms = [],
  forecasts = {},
  selectedHorizon = 'NOW',
  arrival = {},
  hazards = {},
  onSelectStorm
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.8, 87.2],
      zoom: 6,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false
    });

    // Dark Matter basemap from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map layers when storms, forecast horizon, or arrival data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    const group = layersGroupRef.current;
    group.clearLayers();

    // 1. Render Current Storm Cells (when NOW or comparing)
    if (selectedHorizon === 'NOW' || !forecasts[selectedHorizon]) {
      storms.forEach((storm) => {
        const coords = storm.polygon_geojson?.coordinates?.[0];
        if (!coords || coords.length < 3) return;

        // Leaflet expects [lat, lon]
        const latLngs = coords.map(([lon, lat]) => [lat, lon]);

        // Convective color scale based on minimum Brightness Temperature
        let fillColor = '#0284c7'; // Threshold blue
        let strokeColor = '#38bdf8';
        if (storm.min_tb_k < 200.0) {
          fillColor = '#f43f5e'; // Overshooting deep convective core (magenta-red)
          strokeColor = '#fda4af';
        } else if (storm.min_tb_k < 215.0) {
          fillColor = '#9333ea'; // Severe cold core (purple)
          strokeColor = '#c084fc';
        } else if (storm.min_tb_k < 228.0) {
          fillColor = '#0284c7'; // Active convection (sky blue)
          strokeColor = '#38bdf8';
        }

        const polygon = L.polygon(latLngs, {
          color: strokeColor,
          weight: 1.5,
          opacity: 0.9,
          fillColor: fillColor,
          fillOpacity: 0.45
        });

        // Popup with real physical telemetry
        polygon.bindPopup(`
          <div style="font-size: 12px; font-family: 'Inter', sans-serif;">
            <div style="font-weight: 700; color: #38bdf8; font-size: 13px; margin-bottom: 4px;">
              ${storm.storm_id} (${storm.lineage_type})
            </div>
            <div><strong>Min Cloud-Top Tb:</strong> <span style="color:#f43f5e; font-weight:600;">${storm.min_tb_k} K</span></div>
            <div><strong>Convective Area:</strong> ${storm.area_km2.toLocaleString()} km²</div>
            <div><strong>Intensity Index:</strong> ${(storm.intensity * 100).toFixed(0)}%</div>
            <div><strong>Motion Vector:</strong> ${storm.motion.speed_kmh} km/h @ ${storm.motion.direction_deg}°</div>
            ${storm.lineage_parents?.length ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Lineage: ${storm.lineage_parents.join(', ')}</div>` : ''}
          </div>
        `);

        polygon.on('click', () => {
          if (onSelectStorm) onSelectStorm(storm);
        });

        group.addLayer(polygon);

        // Motion vector arrow (draw line from centroid)
        const cLat = storm.centroid.lat;
        const cLon = storm.centroid.lon;
        const speed = storm.motion.speed_kmh;
        const dirRad = (storm.motion.direction_deg * Math.PI) / 180;

        if (speed > 4.0) {
          // Scale vector visually (1 hour vector)
          const dLat = (storm.motion.v / 111.0);
          const dLon = (storm.motion.u / 105.0);

          const arrowLine = L.polyline([[cLat, cLon], [cLat + dLat, cLon + dLon]], {
            color: '#fbbf24',
            weight: 2,
            dashArray: '4, 4'
          });
          group.addLayer(arrowLine);

          // Arrow head point
          const arrowHead = L.circleMarker([cLat + dLat, cLon + dLon], {
            radius: 3,
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 1
          });
          group.addLayer(arrowHead);
        }
      });
    }

    // 2. Render Projected Forecast Horizon (+15m, +30m, +60m, +180m, +360m)
    if (selectedHorizon !== 'NOW' && forecasts[selectedHorizon]) {
      const hzData = forecasts[selectedHorizon];

      if (hzData.type === 'FINE_STORM_SCALE') {
        // Fine storm-scale projected polygons
        hzData.storm_polygons?.forEach((proj) => {
          const coords = proj.polygon_geojson?.coordinates?.[0];
          if (!coords) return;
          const latLngs = coords.map(([lon, lat]) => [lat, lon]);

          const poly = L.polygon(latLngs, {
            color: '#f59e0b',
            weight: 2,
            opacity: 0.95,
            fillColor: '#d97706',
            fillOpacity: 0.35,
            dashArray: '6, 4'
          });

          poly.bindPopup(`
            <div style="font-size: 12px; font-family: 'Inter', sans-serif;">
              <div style="font-weight:700; color:#f59e0b;">${proj.storm_id} Forecast (${selectedHorizon})</div>
              <div><strong>Confidence:</strong> ${(hzData.confidence * 100).toFixed(0)}%</div>
              <div><strong>Uncertainty Margin:</strong> ±${(hzData.uncertainty_score * 100).toFixed(0)}%</div>
              <div><strong>Horizon Target:</strong> ${hzData.target_timestamp.replace('T', ' ').replace('Z', ' UTC')}</div>
            </div>
          `);

          group.addLayer(poly);
        });
      } else {
        // 3-6 hour probabilistic corridors (Broad softer envelope)
        hzData.corridors?.forEach((corridor) => {
          const coords = corridor.corridor_polygon?.coordinates?.[0];
          if (!coords) return;
          const latLngs = coords.map(([lon, lat]) => [lat, lon]);

          const corridorPoly = L.polygon(latLngs, {
            color: '#818cf8',
            weight: 1.5,
            opacity: 0.7,
            fillColor: '#6366f1',
            fillOpacity: 0.22,
            dashArray: '8, 6'
          });

          corridorPoly.bindPopup(`
            <div style="font-size: 12px; font-family: 'Inter', sans-serif;">
              <div style="font-weight:700; color:#818cf8;">Probabilistic Corridor (${selectedHorizon})</div>
              <div><strong>Dispersion Radius:</strong> ±${corridor.dispersion_radius_km} km</div>
              <div><strong>Horizon Confidence:</strong> ${(hzData.confidence * 100).toFixed(0)}% (Wider Uncertainty)</div>
              <div style="font-size:10px; color:#94a3b8; margin-top:4px;">Scientific Honesty Rule: Broad corridor used for long-range lead times instead of discrete cell tracks.</div>
            </div>
          `);

          group.addLayer(corridorPoly);
        });
      }
    }

    // 3. Render Critical Arrival Targets (Station Pins)
    Object.values(arrival).forEach((target) => {
      const isImminent = target.estimated_arrival_minutes !== null && target.estimated_arrival_minutes <= 60.0;
      const markerColor = isImminent ? '#ef4444' : '#38bdf8';

      const customIcon = L.divIcon({
        className: 'custom-target-marker',
        html: `
          <div style="
            background: rgba(15, 23, 42, 0.9);
            border: 2px solid ${markerColor};
            border-radius: 6px;
            padding: 2px 6px;
            color: #f8fafc;
            font-size: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 0 10px ${isImminent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.3)'};
          ">
            <span>📍 ${target.target_name.split(' ')[0]}</span>
            <div style="color: ${isImminent ? '#f87171' : '#38bdf8'}; font-size: 9px;">${target.countdown_display}</div>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      });

      const marker = L.marker([target.lat, target.lon], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-size: 12px; font-family: 'Inter', sans-serif;">
          <div style="font-weight: 700; color: ${markerColor}; font-size: 13px;">${target.target_name}</div>
          <div><strong>Impact ETA:</strong> ${target.countdown_display}</div>
          <div><strong>Impact Probability:</strong> ${(target.impact_probability * 100).toFixed(0)}%</div>
          <div><strong>Confidence:</strong> ${target.confidence}</div>
          <div><strong>Threats:</strong> ${target.hazard_types.join(', ')}</div>
        </div>
      `);

      group.addLayer(marker);
    });

  }, [storms, forecasts, selectedHorizon, arrival]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 500,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        color: '#cbd5e1'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#f8fafc', fontSize: '12px' }}>
          Convective Intensity (Tb Kelvin)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#f43f5e', borderRadius: '2px', display: 'inline-block' }}></span>
            <span>&lt; 200 K (Overshooting Deep Core)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#9333ea', borderRadius: '2px', display: 'inline-block' }}></span>
            <span>200–215 K (Severe Convective Anvil)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#0284c7', borderRadius: '2px', display: 'inline-block' }}></span>
            <span>215–235 K (Convective Initiation Cell)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
            <span style={{ width: '12px', height: '2px', background: '#fbbf24', display: 'inline-block' }}></span>
            <span>Estimated Motion Vector (u, v)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
