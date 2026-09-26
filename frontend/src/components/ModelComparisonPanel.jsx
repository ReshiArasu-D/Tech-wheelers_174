import React from 'react';
import { Cpu, Shuffle, Compass } from 'lucide-react';

export default function ModelComparisonPanel({
  selectedModel = 'CONVGRU',
  onSelectModel,
  selectedHorizon = 'NOW',
  onSelectHorizon,
  uncertaintyMetrics = {}
}) {
  const models = [
    {
      id: 'CONVGRU',
      name: 'ConvGRU Residual',
      tag: 'AI Primary',
      desc: 'Learned convective growth/decay + flow advection',
      icon: Cpu,
      color: '#38bdf8'
    },
    {
      id: 'OPTICAL_FLOW',
      name: 'Optical Flow Advection',
      tag: 'Baseline 2',
      desc: 'OpenCV Farneback kinematic motion advection',
      icon: Compass,
      color: '#fbbf24'
    },
    {
      id: 'PERSISTENCE',
      name: 'Lagrangian Persistence',
      tag: 'Baseline 1',
      desc: 'Zero-motion stationary state assumption',
      icon: Shuffle,
      color: '#94a3b8'
    }
  ];

  const horizons = [
    { id: 'NOW', label: 'Analysis (T)' },
    { id: '15m', label: '+15 min' },
    { id: '30m', label: '+30 min' },
    { id: '60m', label: '+60 min' },
    { id: '180m', label: '+3 hr' },
    { id: '360m', label: '+6 hr' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
      {/* Forecast Horizons Selector */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
          FORECAST HORIZONS (0–6 HOUR)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {horizons.map((hz) => {
            const isSelected = selectedHorizon === hz.id;
            return (
              <button
                key={hz.id}
                onClick={() => onSelectHorizon(hz.id)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                  background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                {hz.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Comparison Toggle */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
          NOWCASTING MODEL COMPARISON
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {models.map((m) => {
            const isSelected = selectedModel === m.id;
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onSelectModel(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  border: `1px solid ${isSelected ? m.color : '#334155'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={14} color={isSelected ? m.color : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                      {m.desc}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: m.color,
                  padding: '2px 5px',
                  borderRadius: '3px',
                  background: 'rgba(0, 0, 0, 0.3)'
                }}>
                  {m.tag}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
