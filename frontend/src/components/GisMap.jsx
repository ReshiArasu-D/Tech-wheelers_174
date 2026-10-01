import React, { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../services/api';

const TERLS_LAT = 8.5241;
const TERLS_LON = 76.9366;

// MapTiler Satellite Hybrid — uses VITE_MAPTILER_API_KEY from .env
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'ehLkmAaIGPEMafg5WhXy';
const SATELLITE_HYBRID_STYLE = `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

export default function GisMap({
  storms = [],
  forecasts = {},
  selectedHorizon = 'NOW',
  arrival = {},
  hazards = {},
  selectedHazard = null,
  selectedStorm = null,
  onSelectStorm,
  is3D = true,
  visibleLayers = {},
  dwrReplayInfo = null,
  dwrCurrentSeq = 0,
  onDwrSeqChange = null,
  flyToLocation = null,
  onDwrFrameLoaded = null,
  stormState = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const stormsRef = useRef([]);
  const stormInfoMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dwrFrameData, setDwrFrameData] = useState(null);
  const [dwrError, setDwrError] = useState(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    stormsRef.current = (dwrFrameData?.storms && dwrFrameData.storms.length > 0)
      ? dwrFrameData.storms
      : storms;
  }, [dwrFrameData, storms]);

  // ── 1. Initialize MapLibre with High-Resolution Satellite Hybrid ───────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let map;
    try {
      map = new Map({
        container: mapContainerRef.current,
        style: SATELLITE_HYBRID_STYLE,
        center: [TERLS_LON + 0.3, TERLS_LAT + 0.8],
        zoom: 7.2,
        pitch: is3D ? 35 : 0,
        bearing: -5,
        attributionControl: false,
      });
    } catch (e) {
      console.error('[GisMap] Satellite Hybrid init error:', e);
      setInitError(String(e));
      return;
    }

    map.on('load', () => {
      // 3D Terrain via AWS Terrarium DEM tiles
      try {
        map.addSource('terrain-src', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 14,
        });
        if (is3D) {
          map.setTerrain({ source: 'terrain-src', exaggeration: 1.4 });
        }
      } catch (err) {
        console.warn('[GisMap] 3D Terrain warning:', err);
      }

      // ── LAYER STACK (Strict Order) ─────────────────────────────────────────

      // 1. INSAT-3D TIR-1 Thermal Infrared Layer (Real MOSDAC HDF5 False-Color Raster)
      const blankPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      map.addSource('insat-raster-src', {
        type: 'image',
        url: blankPixel,
        coordinates: [
          [79.99, 24.01],
          [93.94, 24.01],
          [93.94, 10.06],
          [79.99, 10.06]
        ]
      });
      map.addLayer({
        id: 'insat-tir1-layer',
        type: 'raster',
        source: 'insat-raster-src',
        paint: {
          'raster-opacity': 0.40,
          'raster-fade-duration': 0
        }
      });

      // 2. DWR OBSERVED REFLECTIVITY (TERLS DWR C-Band)
      map.addSource('dwr-obs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'dwr-obs-layer',
        type: 'circle',
        source: 'dwr-obs',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 9, 7],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'dbz'],
            0, '#001a66', 15, '#005ce6', 25, '#009900',
            35, '#ccaa00', 45, '#cc6600', 55, '#990000',
          ],
          'circle-opacity': 0.65,
        },
      });

      // 3. DWR PREDICTED REFLECTIVITY (Indian DWR ConvGRU 30,369 params)
      map.addSource('dwr-pred', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'dwr-pred-layer',
        type: 'circle',
        source: 'dwr-pred',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 9, 8],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'dbz'],
            0, '#003399', 15, '#0099ff', 25, '#00cc00',
            35, '#ffcc00', 45, '#ff6600', 55, '#ff0000',
          ],
          'circle-opacity': 0.85,
          'circle-blur': 0.1,
        },
      });

      // TERLS Radar origin marker (Thiruvananthapuram)
      map.addSource('terls-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [TERLS_LON, TERLS_LAT] },
            properties: {},
          }],
        },
      });
      map.addLayer({
        id: 'terls-circle',
        type: 'circle',
        source: 'terls-src',
        paint: {
          'circle-radius': 9,
          'circle-color': '#0284c7',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      // 4. FORECAST UNCERTAINTY CORRIDOR (Semi-transparent broadening cone)
      map.addSource('corridor-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'corridor-fill',
        type: 'fill',
        source: 'corridor-src',
        paint: {
          'fill-color': '#ea580c',
          'fill-opacity': 0.14
        }
      });
      map.addLayer({
        id: 'corridor-line',
        type: 'line',
        source: 'corridor-src',
        paint: {
          'line-color': '#f97316',
          'line-width': 1.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.6
        }
      });

      // 5. FORECAST TRACK & TIME MARKERS (+15m, +30m, +60m, +180m, +360m)
      map.addSource('track-line-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track-line-src',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-dasharray': [2, 1]
        }
      });

      map.addSource('track-nodes-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'track-nodes-circle',
        type: 'circle',
        source: 'track-nodes-src',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 6. STORM OBJECTS (All real storm cells returned by backend)
      map.addSource('storms-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'storms-fill',
        type: 'fill',
        source: 'storms-src',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity']
        },
      });
      map.addLayer({
        id: 'storms-line',
        type: 'line',
        source: 'storms-src',
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': ['get', 'lineWidth']
        },
      });

      // Storm Centers (Pulsing / highlighted marker for selected storm)
      map.addSource('storm-centers-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'storm-centers-circle',
        type: 'circle',
        source: 'storm-centers-src',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 7. ERA5 U/V ATMOSPHERIC WIND STREAMLINES (Distinct from storm movement)
      map.addSource('era5-wind-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'era5-wind-line',
        type: 'line',
        source: 'era5-wind-src',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.8,
          'line-opacity': 0.75
        }
      });

      // 7b. OPTICAL FLOW MOTION VECTORS LAYER
      map.addSource('motion-vectors-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'motion-vectors-line',
        type: 'line',
        source: 'motion-vectors-src',
        paint: {
          'line-color': '#facc15',
          'line-width': 2.0,
          'line-opacity': 0.85
        }
      });
      map.addLayer({
        id: 'motion-vectors-head',
        type: 'circle',
        source: 'motion-vectors-src',
        filter: ['==', ['get', 'isHead'], true],
        paint: {
          'circle-radius': 3.5,
          'circle-color': '#fef08a',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#854d0e'
        }
      });

      // 8. DYNAMIC HAZARD SPATIAL FIELD (When active & scientifically valid)
      map.addSource('hazard-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'hazard-fill',
        type: 'fill',
        source: 'hazard-src',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.45
        }
      });
      map.addLayer({
        id: 'hazard-line',
        type: 'line',
        source: 'hazard-src',
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': 2.5
        }
      });

      // 9. RISK TARGET ARRIVAL LOCATIONS
      map.addSource('risk-targets-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'risk-targets-circle',
        type: 'circle',
        source: 'risk-targets-src',
        paint: {
          'circle-radius': 6.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Interactive Storm Click Detection on ANY storm cell
      map.on('click', 'storms-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].properties?.storm_id;
          const matched = stormsRef.current.find(s => s.storm_id === clickedId);
          if (matched) {
            onSelectStorm?.(matched);
          }
        }
      });

      // Interactive Storm Click Detection on storm centers circle
      map.on('click', 'storm-centers-circle', (e) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].properties?.storm_id;
          const matched = stormsRef.current.find(s => s.storm_id === clickedId);
          if (matched) {
            onSelectStorm?.(matched);
          }
        }
      });

      map.on('mouseenter', 'storms-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'storms-fill', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'storm-centers-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'storm-centers-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
      map.resize();
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      stormInfoMarkersRef.current.forEach(m => m.remove());
      stormInfoMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // ── 2. Handle 3D Terrain Toggle ────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    if (is3D) {
      try {
        if (map.getSource('terrain-src')) {
          map.setTerrain({ source: 'terrain-src', exaggeration: 1.4 });
        }
        map.easeTo({ pitch: 35, duration: 500 });
      } catch (err) {
        console.warn('Terrain error:', err);
      }
    } else {
      try {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, duration: 500 });
      } catch (err) {
        console.warn('2D switch error:', err);
      }
    }
  }, [is3D, mapLoaded]);

  // ── 3. Handle FlyTo Location Bookmarks ──────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !flyToLocation) return;
    const map = mapRef.current;
    map.flyTo({
      center: flyToLocation.coords,
      zoom: flyToLocation.zoom || 7.2,
      essential: true,
      duration: 1200
    });
  }, [flyToLocation, mapLoaded]);

  // ── 4. Toggle Layer Visibility ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const setLayerVis = (layerId, isVis) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVis ? 'visible' : 'none');
      }
    };

    setLayerVis('insat-tir1-layer', visibleLayers.sat_ir !== false);
    setLayerVis('dwr-obs-layer', visibleLayers.dwr_obs !== false);
    setLayerVis('dwr-pred-layer', visibleLayers.dwr_pred !== false);
    setLayerVis('corridor-fill', visibleLayers.tracks !== false);
    setLayerVis('corridor-line', visibleLayers.tracks !== false);
    setLayerVis('track-line', visibleLayers.tracks !== false);
    setLayerVis('track-nodes-circle', visibleLayers.tracks !== false);
    setLayerVis('storms-fill', visibleLayers.storms !== false);
    setLayerVis('storms-line', visibleLayers.storms !== false);
    setLayerVis('storm-centers-circle', visibleLayers.storms !== false);
    setLayerVis('era5-wind-line', visibleLayers.motion !== false);
    setLayerVis('motion-vectors-line', visibleLayers.motion !== false);
    setLayerVis('motion-vectors-head', visibleLayers.motion !== false);
    setLayerVis('hazard-fill', visibleLayers.hazards !== false);
    setLayerVis('hazard-line', visibleLayers.hazards !== false);
  }, [visibleLayers, mapLoaded]);

  // ── 5. Fetch DWR Replay Frame when Sequence changes ────────────────────────
  useEffect(() => {
    if (dwrReplayInfo === null) return;
    api.getDwrReplayFrame(dwrCurrentSeq)
      .then(frame => {
        setDwrFrameData(frame);
        setDwrError(null);
        onDwrFrameLoaded?.(frame);
      })
      .catch(err => setDwrError(String(err.message)));
  }, [dwrCurrentSeq, dwrReplayInfo]);

  // ── 6. Update DWR Observed and Predicted Reflectivity ──────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const empty = { type: 'FeatureCollection', features: [] };
    if (map.getSource('dwr-pred')) map.getSource('dwr-pred').setData(dwrFrameData?.predicted_reflectivity_geojson || empty);
    if (map.getSource('dwr-obs'))  map.getSource('dwr-obs').setData(dwrFrameData?.observed_reflectivity_geojson  || empty);
  }, [mapLoaded, dwrFrameData]);

  // ── 7. Render ALL Storms + Proper Forecast Track & Uncertainty Corridor ────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const stormFeats = [];
    const centerFeats = [];
    const corridorFeats = [];
    const trackLineFeats = [];
    const trackNodeFeats = [];

    // Prioritize DWR storm cells if in DWR historical replay
    const stormList = (dwrFrameData?.storms && dwrFrameData.storms.length > 0)
      ? dwrFrameData.storms
      : storms;

    stormList.forEach(s => {
      const coords = s.polygon_geojson?.coordinates?.[0];
      if (!coords || coords.length < 3) return;

      const isSelected = selectedStorm && (selectedStorm.storm_id === s.storm_id);
      const dbz = s.max_dbz ?? 30;

      // Refined polygon styling: semi-transparent, not a giant opaque block
      stormFeats.push({
        type: 'Feature',
        properties: {
          storm_id: s.storm_id,
          fillColor: isSelected ? '#ea580c' : (dbz >= 40 ? '#dc2626' : dbz >= 30 ? '#d97706' : '#2563eb'),
          fillOpacity: isSelected ? 0.35 : 0.20,
          strokeColor: isSelected ? '#ffffff' : (dbz >= 40 ? '#fca5a5' : '#7dd3fc'),
          lineWidth: isSelected ? 2.8 : 1.2,
        },
        geometry: { type: 'Polygon', coordinates: [coords] },
      });

      // Storm center marker
      if (s.centroid) {
        centerFeats.push({
          type: 'Feature',
          properties: {
            storm_id: s.storm_id,
            color: isSelected ? '#ffffff' : '#0284c7',
            radius: isSelected ? 7 : 4.5,
          },
          geometry: { type: 'Point', coordinates: [s.centroid.lon, s.centroid.lat] }
        });

        // Forecast track and uncertainty corridor for selected storm
        if (isSelected) {
          // Uncertainty corridor (broadening cone)
          if (s.corridor_polygon && s.corridor_polygon.length > 3) {
            corridorFeats.push({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [s.corridor_polygon] }
            });
          }

          // Forecast track line connecting lead time nodes
          if (s.forecast_tracks && s.forecast_tracks.length > 0) {
            const lineCoords = s.forecast_tracks.map(pt => pt.coordinates);
            trackLineFeats.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: lineCoords }
            });

            // Node markers with lead time labels (+15m, +30m, +60m, +180m, +360m)
            s.forecast_tracks.forEach((pt, pIdx) => {
              const colors = ['#ffffff', '#fcd34d', '#f97316', '#ea580c', '#e11d48', '#84cc16'];
              trackNodeFeats.push({
                type: 'Feature',
                properties: {
                  color: colors[pIdx % colors.length],
                  radius: pIdx === 0 ? 5 : 4,
                  horizon: pt.horizon,
                  dbz: pt.forecast_dbz
                },
                geometry: { type: 'Point', coordinates: pt.coordinates }
              });
            });
          }
        }
      }
    });

    if (map.getSource('storms-src')) {
      map.getSource('storms-src').setData({ type: 'FeatureCollection', features: stormFeats });
    }
    if (map.getSource('storm-centers-src')) {
      map.getSource('storm-centers-src').setData({ type: 'FeatureCollection', features: centerFeats });
    }
    if (map.getSource('corridor-src')) {
      map.getSource('corridor-src').setData({ type: 'FeatureCollection', features: corridorFeats });
    }
    if (map.getSource('track-line-src')) {
      map.getSource('track-line-src').setData({ type: 'FeatureCollection', features: trackLineFeats });
    }
    if (map.getSource('track-nodes-src')) {
      map.getSource('track-nodes-src').setData({ type: 'FeatureCollection', features: trackNodeFeats });
    }
  }, [mapLoaded, storms, dwrFrameData, selectedStorm]);

  // ── 7a. Dynamic Area / Place Name Labels Directly Beside Every Map Dot ──────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Clear previous dot area labels
    stormInfoMarkersRef.current.forEach(m => m.remove());
    stormInfoMarkersRef.current = [];

    if (visibleLayers.storms === false) return;

    const stormList = (dwrFrameData?.storms && dwrFrameData.storms.length > 0)
      ? dwrFrameData.storms
      : storms;

    stormList.forEach(s => {
      const lat = s.centroid?.lat;
      const lon = s.centroid?.lon;
      if (lat == null || lon == null) return;

      const stormId = s.storm_id || s.id;
      if (!stormId) return;

      const isSelected = selectedStorm && (selectedStorm.storm_id === stormId || selectedStorm.id === stormId);

      // Determine dot indicator color based on severity
      const maxD = s.max_dbz ?? 30;
      const dotColor = isSelected ? '#38bdf8' : (maxD >= 40 ? '#ef4444' : maxD >= 30 ? '#f97316' : '#0284c7');

      // Create DOM element for the dynamic area label: ● [Area Name]
      const label = document.createElement('div');
      label.className = `map-dot-area-label ${isSelected ? 'selected' : ''}`;
      label.setAttribute('data-storm-id', stormId);
      label.title = `${stormId} — Click to inspect`;
      label.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(10, 15, 29, 0.85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border: ${isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)'};
        border-radius: 4px;
        padding: 3px 8px;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.2;
        box-shadow: ${isSelected ? '0 0 12px rgba(56, 189, 248, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)' : '0 2px 5px rgba(0, 0, 0, 0.6)'};
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
        white-space: nowrap;
        transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        z-index: ${isSelected ? 50 : 15};
      `;

      label.onmouseenter = () => {
        label.style.borderColor = '#38bdf8';
        label.style.transform = 'translateY(-1px) scale(1.04)';
        label.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.55), 0 4px 10px rgba(0, 0, 0, 0.7)';
      };
      label.onmouseleave = () => {
        label.style.borderColor = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)';
        label.style.transform = 'translateY(0) scale(1)';
        label.style.boxShadow = isSelected ? '0 0 12px rgba(56, 189, 248, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)' : '0 2px 5px rgba(0, 0, 0, 0.6)';
      };

      // Clicking or touching label selects the storm
      label.onclick = (e) => {
        e.stopPropagation();
        onSelectStorm?.(s);
      };
      label.ontouchend = (e) => {
        e.stopPropagation();
        onSelectStorm?.(s);
      };

      // Colored dot glyph
      const dotEl = document.createElement('span');
      dotEl.style.cssText = `
        color: ${dotColor};
        font-size: 12px;
        line-height: 1;
        text-shadow: 0 0 6px ${dotColor};
      `;
      dotEl.textContent = '●';

      // Dynamically resolved area name text
      const nameEl = document.createElement('span');
      nameEl.style.cssText = `
        color: ${isSelected ? '#38bdf8' : '#f8fafc'};
        letter-spacing: 0.2px;
      `;

      const initialName = s.location_name || s.location || null;
      if (initialName && initialName.trim() !== '') {
        nameEl.textContent = initialName;
      } else {
        nameEl.textContent = '...';
        // Asynchronously resolve area name dynamically from real backend OSM reverse geocoder
        api.geocode(lat, lon)
          .then(res => {
            nameEl.textContent = (res?.area_name && res.area_name.trim() !== '') ? res.area_name : 'UNAVAILABLE';
          })
          .catch(() => {
            nameEl.textContent = 'UNAVAILABLE';
          });
      }

      label.appendChild(dotEl);
      label.appendChild(nameEl);

      const marker = new Marker({
        element: label,
        anchor: 'left',
        offset: [12, 0]
      })
      .setLngLat([lon, lat])
      .addTo(map);

      stormInfoMarkersRef.current.push(marker);
    });
  }, [mapLoaded, storms, dwrFrameData, selectedStorm, visibleLayers.storms, onSelectStorm]);

  // ── 7b. Update Real INSAT Raster Image ──────────────────────────────────
  const insatObj = dwrFrameData?.insat_frame || stormState?.sensor_data?.satellite;
  const insatUri = insatObj?.image_data_uri;
  const insatBounds = insatObj?.bounds;
  const insatObsTs = insatObj?.obs_timestamp;
  const insatFile = insatObj?.filename;
  const insatDeltaT = insatObj?.time_difference_minutes;

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !insatUri) return;
    const map = mapRef.current;
    const src = map.getSource('insat-raster-src');
    if (src && insatUri) {
      const minLon = insatBounds?.min_lon ?? 79.99;
      const maxLon = insatBounds?.max_lon ?? 93.94;
      const minLat = insatBounds?.min_lat ?? 10.06;
      const maxLat = insatBounds?.max_lat ?? 24.01;
      src.updateImage({
        url: insatUri,
        coordinates: [
          [minLon, maxLat],
          [maxLon, maxLat],
          [maxLon, minLat],
          [minLon, minLat]
        ]
      });
      map.triggerRepaint();

      console.log(
        `[GIS-MAP INSAT UPDATE] DWR: ${dwrFrameData?.timestamp || 'N/A'} ` +
        `-> Selected File: ${insatFile || 'N/A'} ` +
        `-> Obs: ${insatObsTs || 'N/A'} ` +
        `-> Δt: ${insatDeltaT != null ? insatDeltaT : 'N/A'}m ` +
        `-> Raster Layer Updated`
      );
    }
  }, [mapLoaded, insatUri, insatBounds, insatObsTs, insatFile, insatDeltaT, dwrFrameData?.timestamp]);

  // ── 7c. Update Optical Flow Motion Vectors ────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const mvSrc = map.getSource('motion-vectors-src');
    if (!mvSrc) return;

    const flowVecs = dwrFrameData?.optical_flow || stormState?.optical_flow || [];
    const feats = [];
    const scale = 0.007;

    flowVecs.forEach(v => {
      if ((v.speed_kmh ?? 0) < 1.0) return;
      const rad = (v.direction_deg * Math.PI) / 180.0;
      const dx = Math.sin(rad) * (v.speed_kmh * scale);
      const dy = Math.cos(rad) * (v.speed_kmh * scale);
      const start = [v.lon, v.lat];
      const end = [v.lon + dx, v.lat + dy];

      feats.push({
        type: 'Feature',
        properties: { isHead: false, speed: v.speed_kmh },
        geometry: { type: 'LineString', coordinates: [start, end] }
      });
      feats.push({
        type: 'Feature',
        properties: { isHead: true, speed: v.speed_kmh },
        geometry: { type: 'Point', coordinates: end }
      });
    });

    mvSrc.setData({ type: 'FeatureCollection', features: feats });
  }, [mapLoaded, dwrFrameData, stormState]);

  // ── 8. Render Animated ERA5 U/V Wind Streamlines ───────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const windSource = map.getSource('era5-wind-src');
    if (!windSource) return;

    const era5Ctx = stormState?.sensor_data?.era5 || {};
    const params = era5Ctx?.parameters || {};
    const u_raw = params?.u10_ms?.mean ?? params?.u_ms?.mean ?? 8.5;
    const v_raw = params?.v10_ms?.mean ?? params?.v_ms?.mean ?? 3.2;

    const minLat = TERLS_LAT - 1.8;
    const maxLat = TERLS_LAT + 4.5;
    const minLon = TERLS_LON - 1.8;
    const maxLon = TERLS_LON + 5.5;

    // Initialize continuous animated wind particles
    const NUM_PARTICLES = 36;
    const particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        lon: minLon + Math.random() * (maxLon - minLon),
        lat: minLat + Math.random() * (maxLat - minLat),
        age: Math.floor(Math.random() * 60)
      });
    }

    let animId;
    let lastTime = performance.now();

    const animateWind = (time) => {
      const dt = Math.min((time - lastTime) / 1000.0, 0.1);
      lastTime = time;

      const speedScale = 0.04;
      const windFeatures = [];

      particles.forEach(p => {
        const oldLon = p.lon;
        const oldLat = p.lat;
        p.lon += u_raw * dt * speedScale;
        p.lat += v_raw * dt * speedScale;
        p.age += 1;

        if (p.lon > maxLon || p.lat > maxLat || p.lon < minLon || p.lat < minLat || p.age > 80) {
          p.lon = minLon + Math.random() * (maxLon - minLon);
          p.lat = minLat + Math.random() * 0.5 * (maxLat - minLat);
          p.age = 0;
        } else {
          windFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[oldLon, oldLat], [p.lon, p.lat]]
            }
          });
        }
      });

      if (map.getSource('era5-wind-src')) {
        map.getSource('era5-wind-src').setData({ type: 'FeatureCollection', features: windFeatures });
      }

      animId = requestAnimationFrame(animateWind);
    };

    animId = requestAnimationFrame(animateWind);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [mapLoaded, stormState]);

  // ── 9. Render Dynamic Hazard Field (Scientific Honesty) ───────────────────
  const activeHazardOutput = selectedHazard ? (dwrFrameData?.hazards?.[selectedHazard] || hazards?.[selectedHazard]) : null;
  const isHazardUnavailable = selectedHazard && (!activeHazardOutput || 
    activeHazardOutput.severity === 'UNAVAILABLE' || 
    activeHazardOutput.model_status === 'UNAVAILABLE' || 
    activeHazardOutput.probability == null);

  const hazardColors = {
    lightning: { fill: '#9333ea', stroke: '#c084fc' },
    thunderstorm: { fill: '#ea580c', stroke: '#fb923c' },
    hail: { fill: '#2563eb', stroke: '#60a5fa' },
    heavy_rain: { fill: '#0891b2', stroke: '#38bdf8' },
    cloudburst: { fill: '#d97706', stroke: '#fcd34d' },
    downburst: { fill: '#dc2626', stroke: '#f87171' }
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const hazardSource = map.getSource('hazard-src');
    if (!hazardSource) return;

    if (!selectedHazard || isHazardUnavailable || !activeHazardOutput) {
      hazardSource.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const hazardFeatures = [];
    const theme = hazardColors[selectedHazard] || { fill: '#ea580c', stroke: '#ffffff' };
    
    // If backend output contains an explicit spatial polygon or field, render it
    if (activeHazardOutput.polygon_geojson) {
      hazardFeatures.push({
        type: 'Feature',
        properties: { 
          fillColor: theme.fill, 
          strokeColor: theme.stroke 
        },
        geometry: activeHazardOutput.polygon_geojson
      });
    } else if (activeHazardOutput.spatial_field?.coordinates) {
      hazardFeatures.push({
        type: 'Feature',
        properties: { 
          fillColor: theme.fill, 
          strokeColor: theme.stroke 
        },
        geometry: {
          type: 'Polygon',
          coordinates: activeHazardOutput.spatial_field.coordinates
        }
      });
    }

    hazardSource.setData({ type: 'FeatureCollection', features: hazardFeatures });
  }, [selectedHazard, isHazardUnavailable, activeHazardOutput, mapLoaded]);

  // ── 10. Risk Target Arrival Locations ──────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const riskSource = map.getSource('risk-targets-src');
    if (!riskSource) return;

    const arrivalList = Object.values(arrival || {});
    const feats = arrivalList
      .filter(t => t.lat != null && t.lon != null)
      .map(t => {
        const prob = t.impact_probability ?? 0;
        const color = prob >= 0.7 ? '#ef4444' : (prob >= 0.3 ? '#f59e0b' : '#10b981');
        return {
          type: 'Feature',
          properties: { name: t.target_name, color },
          geometry: { type: 'Point', coordinates: [t.lon, t.lat] }
        };
      });

    riskSource.setData({ type: 'FeatureCollection', features: feats });
  }, [mapLoaded, arrival]);

  // ── Dynamic Map Legend ─────────────────────────────────────────────────────
  const getLegend = () => {
    if (selectedHazard) {
      if (isHazardUnavailable) {
        return {
          title: `${selectedHazard.toUpperCase()} (UNAVAILABLE)`,
          unavailable: true,
          source: activeHazardOutput?.scientific_basis || 'Temporal mismatch with current radar volume scan'
        };
      }

      switch (selectedHazard) {
        case 'lightning':
          return {
            title: 'LIGHTNING PROBABILITY',
            items: [['High ≥70%', '#9333ea'], ['Med 40-70%', '#a855f7'], ['Low 20-40%', '#c084fc']],
            source: activeHazardOutput?.provenance || 'Proxy Calibrated (INSAT-3D TIR1 + ERA5)'
          };
        case 'downburst':
          return {
            title: 'DOWNBURST HAZARD (THUNDERR)',
            items: [['Severe P≥0.70', '#b91c1c'], ['Medium P 0.40-0.70', '#dc2626'], ['Low P <0.40', '#f87171']],
            source: activeHazardOutput?.scientific_basis || 'Downburst Temporal GRU (118,274 params)'
          };
        case 'thunderstorm':
          return {
            title: 'THUNDERSTORM INTENSITY',
            items: [['High ≥80%', '#ea580c'], ['Med 50-80%', '#f97316'], ['Low 25-50%', '#fb923c']],
            source: activeHazardOutput?.scientific_basis || 'Convective Cell Lineage'
          };
        case 'heavy_rain':
          return {
            title: 'HEAVY RAIN INTENSITY',
            items: [['Extreme ≥100 mm/h', '#ef4444'], ['Very Heavy 65-100', '#f97316'], ['Heavy 35-65', '#0891b2']],
            source: activeHazardOutput?.scientific_basis || 'Multimodal ConvGRU Rain'
          };
        case 'cloudburst':
          return {
            title: 'CLOUDBURST PROBABILITY',
            items: [['Extreme Core >100mm/h', '#d97706'], ['Moderate Core', '#fcd34d']],
            source: activeHazardOutput?.scientific_basis || 'Localized Orographic / Thermal Core'
          };
        case 'hail':
          return {
            title: 'HAIL HAZARD',
            items: [['Severe', '#1d4ed8'], ['Moderate', '#2563eb'], ['Low', '#60a5fa']],
            source: activeHazardOutput?.scientific_basis || 'Dual-Pol Hydrometeor Classification'
          };
        default:
          break;
      }
    }

    return {
      title: 'DWR REFLECTIVITY (dBZ)',
      items: [
        ['≥55 dBZ', '#990000'],
        ['45-55 dBZ', '#cc6600'],
        ['35-45 dBZ', '#ccaa00'],
        ['25-35 dBZ', '#009900'],
        ['15-25 dBZ', '#005ce6'],
        ['<15 dBZ', '#001a66']
      ],
      source: 'MOSDAC TERLS C-Band · ConvGRU Checkpoint (30,369 params)'
    };
  };

  const legend = getLegend();

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 0,
      flex: 1,
      overflow: 'hidden',
    }}>
      {/* MapLibre Canvas with MapTiler Satellite Hybrid */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Error notification if MapTiler fails */}
      {initError && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.95)', zIndex: 600,
        }}>
          <div style={{ color: '#dc2626', fontSize: 13, padding: 24, maxWidth: 520 }}>
            <strong>MapTiler Initialization Error:</strong> {initError}
          </div>
        </div>
      )}

      {/* Scientific Honesty Notice when Hazard is Unavailable */}
      {isHazardUnavailable && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: '#ffffff',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '8px 16px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            background: '#fee2e2',
            color: '#dc2626',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            UNAVAILABLE
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedHazard.toUpperCase()} HAZARD: {activeHazardOutput?.scientific_basis || 'TEMPORAL MISMATCH FOR CURRENT REPLAY FRAME'}
          </span>
        </div>
      )}

      {/* Top Right Map Controls: Basemap Selector + Zoom/Target buttons */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}>
        {/* Basemap Dropdown */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          padding: '4px 10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>
            Satellite Hybrid (3D Terrain)
          </span>
          <span style={{ fontSize: '9px', color: '#64748B' }}>▾</span>
        </div>

        {/* Map Control Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom In"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              fontSize: '16px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom Out"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              fontSize: '16px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            −
          </button>
          <button
            onClick={() => {
              if (selectedStorm?.centroid) {
                mapRef.current?.flyTo({
                  center: [selectedStorm.centroid.lon, selectedStorm.centroid.lat],
                  zoom: 8,
                  essential: true
                });
              } else {
                mapRef.current?.flyTo({ center: [TERLS_LON + 0.3, TERLS_LAT + 0.8], zoom: 7.2 });
              }
            }}
            title="Center on Selected Storm"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: '#FFFFFF',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ⌖
          </button>
        </div>
      </div>


      {/* Bottom Left: DWR Reflectivity Legend (Horizontal Spectrum matching Reference) */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 70,
        zIndex: 15,
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        color: '#FFFFFF'
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#F1F5F9', marginBottom: 5 }}>
          DWR Reflectivity (dBZ)
        </div>
        <div style={{
          width: 220,
          height: 10,
          borderRadius: 3,
          background: 'linear-gradient(to right, #001a66 0%, #005ce6 15%, #00cc00 30%, #eab308 45%, #ea580c 65%, #dc2626 80%, #990000 90%, #d946ef 100%)',
          border: '1px solid rgba(255,255,255,0.3)',
          marginBottom: 4
        }} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: '#CBD5E1',
          fontFamily: 'monospace',
          fontWeight: 600,
          width: 220
        }}>
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>60</span>
          <span>&gt;60</span>
        </div>
      </div>

      {/* Bottom Center: Scale Bar matching Reference */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '42%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 6,
        padding: '4px 10px',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backdropFilter: 'blur(6px)'
      }}>
        <div style={{
          width: 120,
          height: 3,
          borderLeft: '2px solid #FFFFFF',
          borderRight: '2px solid #FFFFFF',
          borderBottom: '2px solid #FFFFFF',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: '25%',
            top: 0,
            bottom: 0,
            width: 1,
            background: '#FFFFFF'
          }} />
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: '#FFFFFF'
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 8,
          color: '#E2E8F0',
          fontFamily: 'monospace',
          width: 124,
          marginTop: 2
        }}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>200 km</span>
        </div>
      </div>

      {/* Bottom Right: Wind Speed Legend matching Reference */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 15,
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        color: '#FFFFFF'
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#F1F5F9', marginBottom: 5 }}>
          Wind Speed (km/h)
        </div>
        <div style={{
          width: 180,
          height: 10,
          borderRadius: 3,
          background: 'linear-gradient(to right, #001a66 0%, #0099ff 20%, #10b981 40%, #eab308 60%, #ea580c 80%, #dc2626 100%)',
          border: '1px solid rgba(255,255,255,0.3)',
          marginBottom: 4
        }} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: '#CBD5E1',
          fontFamily: 'monospace',
          fontWeight: 600,
          width: 180
        }}>
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
