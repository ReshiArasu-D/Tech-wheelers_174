import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  CloudLightning, 
  AlertCircle, 
  Droplets, 
  CloudRain, 
  Wind, 
  MapPin, 
  Navigation,
  Compass,
  Layers,
  BarChart2,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Bot
} from 'lucide-react';
import { api } from '../services/api';

export default function RightStormPanel({
  selectedStorm = null,
  storms = [],
  onSelectStorm = null,
  dwrFrameData = null,
  stormState = null,
  selectedHazard = null,
  onSelectHazard,
  selectedHorizon = 'NOW',
  onSelectHorizon,
  currentTimestamp,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'forecast' | 'profile' | 'raw'
  const [dynamicPlace, setDynamicPlace] = useState('UNAVAILABLE');

  // Extract dynamic storm attributes directly from backend storm object
  const stormId = selectedStorm?.storm_id || 'UNAVAILABLE';
  const severity = selectedStorm?.severity || (selectedStorm?.max_dbz != null ? (selectedStorm.max_dbz >= 45 ? 'SEVERE' : (selectedStorm.max_dbz >= 35 ? 'HIGH' : 'MODERATE')) : 'UNAVAILABLE');
  const cLat = selectedStorm?.centroid?.lat;
  const cLon = selectedStorm?.centroid?.lon;
  const speed = selectedStorm?.motion?.speed_kmh;
  const bearing = selectedStorm?.motion?.bearing_cardinal;
  const area = selectedStorm?.area_km2 != null ? `${Math.round(selectedStorm.area_km2).toLocaleString()} km²` : 'N/A';
  const maxDbz = selectedStorm?.max_dbz != null ? `${selectedStorm.max_dbz} dBZ` : 'N/A';
  const vil = selectedStorm?.vil != null ? `${selectedStorm.vil} kg/m²` : 'N/A';
  const topHeight = selectedStorm?.top_height_km != null ? `${selectedStorm.top_height_km} km` : 'N/A';

  // Dynamic geographic place name: prefer backend resolved location_name, else fetch dynamically via OSM, fallback UNAVAILABLE
  useEffect(() => {
    if (selectedStorm?.location_name && selectedStorm.location_name !== 'UNAVAILABLE') {
      setDynamicPlace(selectedStorm.location_name);
    } else if (cLat != null && cLon != null) {
      api.geocode(cLat, cLon)
        .then(res => setDynamicPlace(res?.area_name || 'UNAVAILABLE'))
        .catch(() => setDynamicPlace('UNAVAILABLE'));
    } else {
      setDynamicPlace('UNAVAILABLE');
    }
  }, [selectedStorm?.location_name, cLat, cLon]);

  const placeName = dynamicPlace;

  // Real backend hazards from DWR replay frame or stormState
  const backendHazards = dwrFrameData?.hazards || stormState?.hazards || {};

  // 6 Hazard Heads definition with mini SVG sparkline
  const hazardDefinitions = [
    {
      id: 'lightning',
      name: 'Lightning',
      icon: Zap,
      color: '#9333EA',
      sparkline: 'M0,16 Q15,14 30,10 T60,4',
      sparkColor: '#C084FC',
      data: backendHazards.lightning || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    },
    {
      id: 'thunderstorm',
      name: 'Thunderstorm',
      icon: CloudLightning,
      color: '#EA580C',
      sparkline: 'M0,16 Q15,12 30,8 T60,2',
      sparkColor: '#F87171',
      data: backendHazards.thunderstorm || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    },
    {
      id: 'hail',
      name: 'Hail',
      icon: AlertCircle,
      color: '#2563EB',
      sparkline: 'M0,16 Q20,15 40,12 T60,8',
      sparkColor: '#60A5FA',
      data: backendHazards.hail || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    },
    {
      id: 'heavy_rain',
      name: 'Heavy Rain',
      icon: Droplets,
      color: '#0891B2',
      sparkline: 'M0,16 Q15,13 30,7 T60,3',
      sparkColor: '#38BDF8',
      data: backendHazards.heavy_rain || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    },
    {
      id: 'cloudburst',
      name: 'Cloudburst',
      icon: CloudRain,
      color: '#D97706',
      sparkline: 'M0,16 Q20,14 40,10 T60,6',
      sparkColor: '#FBBF24',
      data: backendHazards.cloudburst || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    },
    {
      id: 'downburst',
      name: 'Downburst',
      icon: Wind,
      color: '#DC2626',
      sparkline: 'M0,16 Q15,14 30,10 T60,4',
      sparkColor: '#F87171',
      data: backendHazards.downburst || {
        severity: 'UNAVAILABLE',
        probability: null,
        confidence: 'UNAVAILABLE',
        uncertainty: null,
        affected_area_km2: null,
        model_status: 'UNAVAILABLE'
      }
    }
  ];

  const activeHazardDef = hazardDefinitions.find(h => h.id === selectedHazard);
  const activeHazardData = activeHazardDef?.data;
  const isCurrentHazardUnavailable = !activeHazardData || 
    activeHazardData.severity === 'UNAVAILABLE' || 
    activeHazardData.model_status === 'UNAVAILABLE' || 
    activeHazardData.probability == null;

  // Real Risk & Arrival data directly from backend dwrFrameData or stormState
  const activeRisk = dwrFrameData?.risk || stormState?.risk;
  const riskScore = activeRisk?.overall_risk_score != null 
    ? (Math.round(activeRisk.overall_risk_score * 10) / 10).toFixed(1) 
    : 'N/A';
  const riskSeverity = activeRisk?.risk_level || 'UNAVAILABLE';
  
  // Dynamic Nearby Locations from Backend Arrival Targets
  const activeArrival = dwrFrameData?.arrival || stormState?.arrival || {};
  const arrivalEntries = Object.values(activeArrival);
  const activeImpactTarget = arrivalEntries.find(t => t.estimated_arrival_minutes != null) || arrivalEntries[0];
  const arrivalCountdownDisplay = activeImpactTarget?.countdown_display || 
    (activeImpactTarget?.estimated_arrival_minutes != null ? `${Math.round(activeImpactTarget.estimated_arrival_minutes)} min` : 'NO IMPACT DETECTED');

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'SEVERE':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'HIGH':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'MEDIUM':
      case 'MODERATE':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'LOW':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'UNAVAILABLE':
      default:
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
  };

  const nearbyLocations = arrivalEntries.slice(0, 5).map(target => {
    const prob = target.impact_probability ?? 0;
    const risk = prob >= 0.7 ? 'HIGH' : (prob >= 0.3 ? 'MODERATE' : 'LOW');
    const badge = getSeverityBadge(risk);
    return {
      name: target.target_name,
      eta: target.estimated_arrival_minutes != null ? `${Math.round(target.estimated_arrival_minutes)} min` : (target.countdown_display || 'NO IMPACT'),
      risk,
      riskBg: badge.bg,
      riskColor: badge.text
    };
  });

  // Forecast DBZ points from real storm forecast tracks
  const forecastPoints = selectedStorm?.forecast_tracks ? selectedStorm.forecast_tracks.map(pt => ({
    label: pt.horizon,
    dbz: pt.forecast_dbz != null ? `${pt.forecast_dbz} dBZ` : 'N/A',
    horizon: pt.horizon === 'NOW' ? 'NOW' : pt.horizon.replace('+', '').replace('m', '')
  })) : [];

  const headerBadge = getSeverityBadge(severity);

  return (
    <div 
      id="right-storm-panel-container"
      style={{
        width: '420px',
        height: '100%',
        background: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 25,
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.04)'
      }}>
      {/* 1. Header: Storm Cell #ID + Severity + Minimize/Close */}
      <div style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
            <select
              value={selectedStorm?.storm_id || ''}
              onChange={(e) => {
                const found = storms.find(s => s.storm_id === e.target.value);
                if (found && onSelectStorm) onSelectStorm(found);
              }}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0F172A',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '5px 24px 5px 8px',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                outline: 'none',
                width: '100%',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              {storms && storms.length > 0 ? (
                storms.map(s => (
                  <option key={s.storm_id} value={s.storm_id}>
                    Storm Cell #{s.storm_id} {s.max_dbz ? `(${s.max_dbz} dBZ)` : ''}
                  </option>
                ))
              ) : (
                <option value={stormId}>Storm Cell #{stormId}</option>
              )}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748B' }} />
          </div>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '4px',
            background: headerBadge.bg,
            border: `1px solid ${headerBadge.border}`,
            color: headerBadge.text,
            letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            {severity}
          </span>
        </div>

        {/* Minimize / Close Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            title="Minimize slide panel (Collapse to right)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E2E8F0';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 2. Sub Tabs: Overview | Forecast | Vertical Profile | Raw Data */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        position: 'sticky',
        top: '47px',
        zIndex: 10
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'forecast', label: 'Forecast' },
          { id: 'profile', label: 'Vertical Profile' },
          { id: 'raw', label: 'Raw Data' }
        ].map(tab => {
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: isAct ? 700 : 500,
                color: isAct ? '#2563EB' : '#64748B',
                background: 'transparent',
                border: 'none',
                borderBottom: isAct ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content - FULLY SCROLLABLE */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* OVERVIEW CONTENT */}
        {activeTab === 'overview' && (
          <>
            {/* Storm Cell Scope Preview + Key Telemetry */}
            <div 
              className="box-card"
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px'
              }}
            >
              {/* Radar Scope Thumbnail */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#0D1624',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {dwrFrameData?.dwr_image_data_uri ? (
                  <img
                    src={dwrFrameData.dwr_image_data_uri}
                    alt="TERLS DWR Reflectivity"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '8px', fontFamily: 'var(--font-mono)' }}>
                    SCANNING...
                  </div>
                )}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                  <circle cx="50%" cy="50%" r="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <circle cx="50%" cy="50%" r="32" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  <circle cx="50%" cy="50%" r="3" fill="#FFFFFF" />
                </svg>
                <div style={{
                  position: 'absolute',
                  bottom: '3px',
                  left: '3px',
                  right: '3px',
                  fontSize: '7px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  background: 'rgba(0,0,0,0.65)',
                  padding: '1px 2px',
                  borderRadius: '2px',
                  textAlign: 'center',
                  letterSpacing: '0.04em'
                }}>
                  DWR REFLECTIVITY
                </div>
              </div>

              {/* Telemetry Metrics Table */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Location</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {cLat != null && cLon != null ? `${cLat.toFixed(2)}°N, ${cLon.toFixed(2)}°E` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={10} /> Nearest Area
                  </span>
                  <span style={{ color: '#7C3AED', fontWeight: 700, maxWidth: '160px', textAlign: 'right' }}>
                    {placeName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Movement</span>
                  <span style={{ color: '#2563EB', fontWeight: 700 }}>
                    {speed != null ? `${speed} km/h ${bearing ? `(${bearing})` : ''}` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Arrival Countdown</span>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'var(--font-mono)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {arrivalCountdownDisplay}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Max dBZ</span>
                  <span style={{ color: '#DC2626', fontWeight: 800 }}>
                    {maxDbz}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>VIL</span>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>
                    {vil}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Top Height (EST)</span>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>
                    {topHeight}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Affected Area</span>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>
                    {area}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. MULTI-HAZARD ASSESSMENT (6 HEADS) */}
            <div 
              className="box-card"
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '11px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                  Multi-Hazard Assessment (6 Heads)
                </span>
                <span style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: 500 }}>
                  Click to visualize on map
                </span>
              </div>

              {/* 2 ROWS x 3 COLS GRID with sparklines */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
                {hazardDefinitions.map(hazard => {
                  const Icon = hazard.icon;
                  const isSelected = selectedHazard === hazard.id;
                  const badge = getSeverityBadge(hazard.data?.severity);

                  return (
                    <div
                      key={hazard.id}
                      id={`hazard-card-${hazard.id}`}
                      onClick={() => onSelectHazard?.(isSelected ? null : hazard.id)}
                      className="box-card-interactive"
                      style={{
                        padding: '8px 9px',
                        borderRadius: '7px',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        border: isSelected 
                          ? `1.5px solid ${hazard.color}` 
                          : '1px solid #CBD5E1',
                        boxShadow: isSelected ? `0 2px 8px -1px ${hazard.color}33` : '0 1px 2px rgba(15, 23, 42, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: isSelected ? '#DBEAFE' : '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={12} color={isSelected ? hazard.color : '#475569'} strokeWidth={2.2} />
                        </div>
                        <span style={{
                          fontSize: '7.5px',
                          fontWeight: 800,
                          padding: '1.5px 5px',
                          borderRadius: '4px',
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border || 'transparent'}`
                        }}>
                          {hazard.data?.severity}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.70rem', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#0F172A' : '#1E293B', marginTop: '2px' }}>
                        {hazard.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: hazard.color, fontFamily: 'var(--font-mono)' }}>
                          {hazard.data?.probability !== null && hazard.data?.probability !== undefined ? `${Math.round(hazard.data.probability * 100)}%` : 'N/A'}
                        </span>
                        
                        {/* Mini Sparkline Curve matching Reference */}
                        <svg width="36" height="14" viewBox="0 0 60 18" style={{ overflow: 'visible' }}>
                          <path
                            d={hazard.sparkline}
                            fill="none"
                            stroke={hazard.sparkColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. ACTIVE HAZARD DETAILS (when selectedHazard is active) */}
            {selectedHazard && activeHazardDef && (
              <div style={{
                background: isCurrentHazardUnavailable ? '#FFF1F2' : '#F8FAFC',
                border: `1px solid ${isCurrentHazardUnavailable ? '#FCA5A5' : '#CBD5E1'}`,
                borderRadius: '8px',
                padding: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
                    {activeHazardDef.name} Hazard Details
                  </span>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: isCurrentHazardUnavailable ? '#FEE2E2' : '#DBEAFE',
                    color: isCurrentHazardUnavailable ? '#DC2626' : '#1E40AF'
                  }}>
                    {activeHazardData?.model_status || 'UNAVAILABLE'}
                  </span>
                </div>

                {isCurrentHazardUnavailable ? (
                  <div style={{ fontSize: '0.72rem', color: '#991B1B', lineHeight: 1.4 }}>
                    <strong>Scientific Basis / Status:</strong> {activeHazardData?.scientific_basis || 'Temporal mismatch with current radar volume scan. Output marked as UNAVAILABLE by backend.'}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      <div style={{ background: '#FFFFFF', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: '#64748B' }}>Probability</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: activeHazardDef.color, fontFamily: 'monospace' }}>
                          {activeHazardData?.probability != null ? `${Math.round(activeHazardData.probability * 100)}%` : 'N/A'}
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: '#64748B' }}>Confidence</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                          {activeHazardData?.confidence || 'N/A'}
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: '#64748B' }}>Uncertainty</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>
                          {activeHazardData?.uncertainty != null ? `${Math.round(activeHazardData.uncertainty * 100)}%` : 'N/A'}
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: '#64748B' }}>Affected Area</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>
                          {activeHazardData?.spatial_field?.affected_area_km2 != null ? `${Math.round(activeHazardData.spatial_field.affected_area_km2).toLocaleString()} km²` : (activeHazardData?.affected_area_km2 != null ? `${Math.round(activeHazardData.affected_area_km2).toLocaleString()} km²` : 'N/A')}
                        </div>
                      </div>
                    </div>
                    {activeHazardData?.scientific_label && (
                      <div style={{ fontSize: '0.70rem', color: '#475569', marginTop: '6px', fontStyle: 'italic' }}>
                        {activeHazardData.scientific_label}
                      </div>
                    )}
                    {activeHazardData?.provenance && (
                      <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>
                        Sensor: {activeHazardData.provenance}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 5. RISK SCORE & ARRIVAL COUNTDOWN */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              {/* Risk Score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '7.5px', color: '#DC2626', fontWeight: 800, letterSpacing: '0.04em' }}>
                    RISK SCORE
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace', lineHeight: 1 }}>
                    {riskScore} <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>/ 100</span>
                  </div>
                </div>
                <div style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '8px',
                  fontWeight: 800
                }}>
                  {riskSeverity}
                </div>
              </div>

              {/* Vertical divider */}
              <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />

              {/* Arrival Countdown */}
              <div>
                <div style={{ fontSize: '7.5px', color: '#64748B', fontWeight: 700, letterSpacing: '0.02em' }}>
                  Arrival Countdown ({activeImpactTarget?.target_name ? activeImpactTarget.target_name.split(' ')[0] : 'Target'})
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>
                    {arrivalCountdownDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. KEY NEARBY LOCATIONS TABLE (Matching Reference Image) */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                padding: '4px 6px',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '0.70rem',
                fontWeight: 700,
                color: '#64748B',
                marginBottom: '4px'
              }}>
                <span>Key Nearby Locations</span>
                <span style={{ textAlign: 'center' }}>ETA</span>
                <span style={{ textAlign: 'right' }}>Risk</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {nearbyLocations.length > 0 ? nearbyLocations.map(loc => (
                  <div
                    key={loc.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr',
                      alignItems: 'center',
                      padding: '5px 6px',
                      borderRadius: '4px',
                      background: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                      fontSize: '0.72rem'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loc.name}
                    </span>
                    <span style={{ textAlign: 'center', color: '#334155', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.68rem' }}>
                      {loc.eta}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{
                        fontSize: '7.5px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: loc.riskBg,
                        color: loc.riskColor
                      }}>
                        {loc.risk}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '8px', fontSize: '0.72rem', color: '#64748B', textAlign: 'center' }}>
                    No active arrival impact targets reported by backend.
                  </div>
                )}
              </div>
            </div>

            {/* 7. CONFORMAL UNCERTAINTY QUANTIFICATION */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                  Conformal Uncertainty Quantification
                </span>
                <span style={{ fontSize: '0.65rem', color: '#16A34A', fontWeight: 700 }}>
                  90% Coverage Target
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div style={{ background: '#F8FAFC', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '8px', color: '#64748B' }}>Active Modalities</div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A' }}>
                    {stormState?.uncertainty?.active_modalities || 'N/A'}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '8px', color: '#64748B' }}>System Conf.</div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A' }}>
                    {stormState?.uncertainty?.effective_system_confidence != null 
                      ? `${Math.round(stormState.uncertainty.effective_system_confidence * 100)}%` 
                      : 'N/A'}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '5px', borderRadius: '4px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '8px', color: '#64748B' }}>30m Horizon Unc.</div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A' }}>
                    {stormState?.uncertainty?.horizon_uncertainty?.['30m'] != null
                      ? `±${Math.round(stormState.uncertainty.horizon_uncertainty['30m'] * 100)}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>
              {stormState?.uncertainty?.scientific_disclaimer && (
                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '6px', lineHeight: 1.3, fontStyle: 'italic' }}>
                  {stormState.uncertainty.scientific_disclaimer}
                </div>
              )}
            </div>

            {/* 7b. MULTI-SENSOR FUSION INTEGRITY STATUS */}
            {dwrFrameData?.fusion_status && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                    Multi-Sensor Fusion Integrity
                  </span>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: (dwrFrameData.fusion_status.dwr_insat_spatial_overlap && dwrFrameData.fusion_status.dwr_insat_temporal_overlap !== false && dwrFrameData.fusion_status.mode?.includes('FULL')) ? '#DCFCE7' : '#FEF3C7',
                    color: (dwrFrameData.fusion_status.dwr_insat_spatial_overlap && dwrFrameData.fusion_status.dwr_insat_temporal_overlap !== false && dwrFrameData.fusion_status.mode?.includes('FULL')) ? '#15803D' : '#92400E',
                    border: `1px solid ${(dwrFrameData.fusion_status.dwr_insat_spatial_overlap && dwrFrameData.fusion_status.dwr_insat_temporal_overlap !== false && dwrFrameData.fusion_status.mode?.includes('FULL')) ? '#86EFAC' : '#FCD34D'}`
                  }}>
                    {(dwrFrameData.fusion_status.dwr_insat_spatial_overlap && dwrFrameData.fusion_status.dwr_insat_temporal_overlap !== false && dwrFrameData.fusion_status.mode?.includes('FULL')) ? 'FULL FUSION' : 'RADAR-ANCHORED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.71rem', color: '#1E293B', fontWeight: 700 }}>
                  {dwrFrameData.fusion_status.mode}
                </div>
                <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '4px', lineHeight: 1.35 }}>
                  {dwrFrameData.fusion_status.eligibility}
                </div>
              </div>
            )}

            {/* 8. OPERATIONAL ALERT / HITL SIGN-OFF STATUS */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#16A34A" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>
                    Human-in-the-Loop Sign-Off Status
                  </span>
                </div>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: '#DCFCE7',
                  color: '#15803D'
                }}>
                  ACTIVE
                </span>
              </div>
            </div>
          </>
        )}

        {/* FORECAST TAB */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Forecast Trajectory Timesteps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {forecastPoints.map(fp => (
                  <div
                    key={fp.label}
                    onClick={() => onSelectHorizon?.(fp.horizon)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: selectedHorizon === fp.horizon ? '#EFF6FF' : '#F8FAFC',
                      border: selectedHorizon === fp.horizon ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Horizon {fp.label}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626' }}>{fp.dbz}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Volumetric Core Extent (TERLS RHI)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
                Echo-top reaches {topHeight} with peak reflectivity of {maxDbz} and VIL of {vil}.
              </div>
              {dwrFrameData?.vertical_profile?.rhi_image_data_uri && (
                <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #CBD5E1', marginTop: '6px' }}>
                  <img
                    src={dwrFrameData.vertical_profile.rhi_image_data_uri}
                    alt="TERLS RHI Cross Section"
                    style={{ width: '100%', display: 'block' }}
                  />
                  <div style={{ fontSize: '8px', color: '#64748B', padding: '4px 6px', background: '#F8FAFC', textAlign: 'center' }}>
                    Azimuth {dwrFrameData.vertical_profile.azimuth_deg ?? 45}° | Max dBZ {dwrFrameData.vertical_profile.max_dbz} | Height {dwrFrameData.vertical_profile.top_height_km} km
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RAW DATA TAB */}
        {activeTab === 'raw' && (
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#334155',
            overflowX: 'auto'
          }}>
            <pre>{JSON.stringify(selectedStorm || {}, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
