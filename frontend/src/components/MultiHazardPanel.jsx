import React, { useState } from 'react';
import { Zap, CloudRain, Wind, AlertCircle } from 'lucide-react';

export default function MultiHazardPanel({ hazards = {} }) {
  const [activeTab, setActiveTab] = useState('lightning');

  const tabs = [
    { id: 'lightning', label: 'Lightning', icon: Zap, color: '#f59e0b' },
    { id: 'hail', label: 'Hail', icon: AlertCircle, color: '#ec4899' },
    { id: 'downburst', label: 'Downburst', icon: Wind, color: '#06b6d4' },
    { id: 'cloudburst', label: 'Cloudburst', icon: CloudRain, color: '#3b82f6' }
  ];

  const currentHazard = hazards[activeTab] || {
    hazard_type: activeTab,
    severity: 'LOW',
    probability: 0.25,
    proxy_indicator: 'Nominal convective intensity proxy',
    scientific_label: 'Prototype proxy indicator',
    affected_area_km2: 0
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'SEVERE': return 'badge-alert';
      case 'HIGH': return 'badge-alert';
      case 'MODERATE': return 'badge-proxy';
      default: return 'badge-real';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
          MULTI-HAZARD HEADS
        </h3>
        <span className="badge-proxy" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
          PROTOTYPE PROXY INDICATORS
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 4px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                border: isSelected ? `1px solid ${t.color}` : '1px solid #334155',
                background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={12} color={isSelected ? t.color : '#64748b'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active Hazard Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '8px',
        padding: '10px 12px',
        border: '1px solid rgba(56, 189, 248, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase' }}>
            {currentHazard.hazard_type} Proxy
          </span>
          <span className={getSeverityBadgeClass(currentHazard.severity)}
                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            {currentHazard.severity} THREAT
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Calibrated Probability</div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
              {(currentHazard.probability * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Est. Threat Area</div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
              {currentHazard.affected_area_km2?.toLocaleString() || 0} km²
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '6px', background: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '4px' }}>
          <strong>Physical Proxy:</strong> {currentHazard.proxy_indicator}
        </div>

        {/* Scientific Honesty Disclaimer Banner */}
        <div style={{
          fontSize: '0.65rem',
          color: '#fbbf24',
          lineHeight: '1.3',
          borderLeft: '2px solid #f59e0b',
          paddingLeft: '6px'
        }}>
          <strong>Scientific Note:</strong> {currentHazard.scientific_label}
        </div>
      </div>
    </div>
  );
}
