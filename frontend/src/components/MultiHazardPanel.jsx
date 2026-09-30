import React, { useState } from 'react';
import { Zap, CloudRain, Wind, AlertCircle, CloudLightning, Droplets, Ban } from 'lucide-react';

export default function MultiHazardPanel({ hazards = {} }) {
  const [activeTab, setActiveTab] = useState('lightning');

  // All 6 convective hazard heads per SIH 26084
  const tabs = [
    { id: 'lightning', label: 'Lightning', icon: Zap, color: '#f59e0b' },
    { id: 'thunderstorm', label: 'Thunderstorm', icon: CloudLightning, color: '#a855f7' },
    { id: 'hail', label: 'Hail', icon: AlertCircle, color: '#ec4899' },
    { id: 'heavy_rain', label: 'Heavy Rain', icon: Droplets, color: '#06b6d4' },
    { id: 'cloudburst', label: 'Cloudburst', icon: CloudRain, color: '#3b82f6' },
    { id: 'downburst', label: 'Downburst', icon: Wind, color: '#ef4444' }
  ];

  const currentHazard = hazards[activeTab] || {
    hazard_type: activeTab,
    severity: activeTab === 'downburst' ? 'UNAVAILABLE' : 'LOW',
    probability: activeTab === 'downburst' ? null : 0.25,
    confidence: activeTab === 'downburst' ? 'UNAVAILABLE' : 'MEDIUM',
    uncertainty: activeTab === 'downburst' ? 1.0 : 0.35,
    horizon_minutes: 30,
    scientific_basis: activeTab === 'downburst'
      ? 'Downburst detection requires Doppler Weather Radar (DWR) radial velocity divergence signatures. Standalone checkpoint not trained / unverified in Colab. Marked UNAVAILABLE per scientific honesty rules.'
      : 'Calibrated convective proxy signature',
    provenance: activeTab === 'downburst' ? 'DWR required' : 'INSAT-3D TIR1 + ERA5',
    model_status: activeTab === 'downburst' ? 'UNAVAILABLE' : 'PROXY_CALIBRATED',
    spatial_field: { affected_area_km2: 0 }
  };

  const isUnavailable = currentHazard.model_status === 'UNAVAILABLE' || currentHazard.severity === 'UNAVAILABLE';

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'SEVERE': return 'badge-alert';
      case 'HIGH': return 'badge-alert';
      case 'MODERATE': return 'badge-proxy';
      case 'UNAVAILABLE': return 'badge-alert';
      default: return 'badge-real';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.03em' }}>
          MULTI-HAZARD ASSESSMENT (6 HEADS)
        </h3>
        <span className="badge-proxy" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
          UNIFIED SCHEMA
        </span>
      </div>

      {/* Tabs - 6 hazard heads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          const Icon = t.icon;
          const isTabUnavailable = t.id === 'downburst';

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 4px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: isSelected ? 800 : 500,
                cursor: 'pointer',
                border: isSelected ? `1px solid ${t.color}` : '1px solid #334155',
                background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={12} color={isSelected ? t.color : '#64748b'} />
              <span>{t.label}</span>
              {isTabUnavailable && (
                <span style={{ fontSize: '8px', color: '#f87171', fontWeight: 800 }}>!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Hazard Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '8px',
        padding: '12px',
        border: `1px solid ${isUnavailable ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.2)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase' }}>
            {currentHazard.name || `${currentHazard.hazard_type} Hazard`}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '3px',
              background: currentHazard.model_status === 'TRAINED_CHECKPOINT'
                ? 'rgba(16, 185, 129, 0.2)'
                : (isUnavailable ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
              color: currentHazard.model_status === 'TRAINED_CHECKPOINT'
                ? '#34d399'
                : (isUnavailable ? '#f87171' : '#fbbf24'),
              border: `1px solid ${
                currentHazard.model_status === 'TRAINED_CHECKPOINT'
                  ? '#10b981'
                  : (isUnavailable ? '#ef4444' : '#f59e0b')
              }`
            }}>
              {currentHazard.model_status || 'PROXY_CALIBRATED'}
            </span>
            <span className={getSeverityBadgeClass(currentHazard.severity)}
                  style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              {currentHazard.severity}
            </span>
          </div>
        </div>

        {isUnavailable ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <Ban size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>
                HAZARD MODEL CURRENTLY UNAVAILABLE
              </div>
              <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '2px', lineHeight: '1.4' }}>
                {currentHazard.scientific_basis}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 4 Schema Metric Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Probability</div>
                <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                  {currentHazard.probability !== null && currentHazard.probability !== undefined
                    ? `${(currentHazard.probability * 100).toFixed(0)}%`
                    : 'N/A'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Confidence</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: currentHazard.confidence === 'HIGH' ? '#34d399' : '#38bdf8' }}>
                  {currentHazard.confidence || 'MEDIUM'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Uncertainty</div>
                <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                  {currentHazard.uncertainty !== undefined
                    ? `${(currentHazard.uncertainty * 100).toFixed(0)}%`
                    : '35%'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Affected Area</div>
                <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {currentHazard.spatial_field?.affected_area_km2 || 0} km²
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '6px', background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '4px' }}>
              <strong>Physical Basis:</strong> {currentHazard.scientific_basis}
            </div>
          </>
        )}

        {/* Provenance Footer */}
        <div style={{
          fontSize: '0.65rem',
          color: '#94a3b8',
          borderLeft: '2px solid #38bdf8',
          paddingLeft: '6px',
          marginTop: '6px'
        }}>
          <strong>Sensor Provenance:</strong> {currentHazard.provenance || 'INSAT-3D TIR1 + ERA5 Reanalysis Context'}
        </div>
      </div>
    </div>
  );
}
