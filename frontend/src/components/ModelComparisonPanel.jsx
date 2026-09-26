import React from 'react';
import { Cpu, Shuffle, Compass, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ModelComparisonPanel({
  selectedModel = 'CONVGRU',
  onSelectModel,
  selectedHorizon = 'NOW',
  onSelectHorizon,
  modelInfo = null,
  uncertaintyMetrics = {}
}) {
  const isTrained = modelInfo?.status === 'trained';

  const models = [
    {
      id: 'CONVGRU',
      name: 'ConvGRU Residual',
      tag: isTrained ? '● TRAINED' : '○ MODEL NOT LOADED',
      desc: isTrained
        ? 'Learned convective growth/decay + flow advection'
        : 'TRAINED MODEL NOT AVAILABLE — Awaiting Colab checkpoint (convgru_best.pt)',
      icon: Cpu,
      color: isTrained ? '#10b981' : '#f59e0b',
      statusClass: isTrained ? 'trained' : 'not-loaded',
      isTrained: isTrained
    },
    {
      id: 'OPTICAL_FLOW',
      name: 'Optical Flow Advection',
      tag: 'Baseline 2',
      desc: 'OpenCV Farneback kinematic motion advection',
      icon: Compass,
      color: '#fbbf24',
      isTrained: true
    },
    {
      id: 'PERSISTENCE',
      name: 'Lagrangian Persistence',
      tag: 'Baseline 1',
      desc: 'Zero-motion stationary state assumption',
      icon: Shuffle,
      color: '#94a3b8',
      isTrained: true
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
            NOWCASTING MODEL BENCHMARK
          </div>
          <span style={{
            fontSize: '0.62rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: isTrained ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${isTrained ? '#10b981' : '#f59e0b'}`,
            color: isTrained ? '#34d399' : '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isTrained ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
            {isTrained ? 'ConvGRU ● TRAINED' : 'ConvGRU ○ MODEL NOT LOADED'}
          </span>
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
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  border: `1px solid ${isSelected ? m.color : '#334155'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <Icon size={14} color={isSelected ? m.color : '#64748b'} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                      {m.name}
                    </div>
                    <div style={{
                      fontSize: '0.62rem',
                      color: m.id === 'CONVGRU' && !isTrained ? '#f59e0b' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
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
                  background: 'rgba(0, 0, 0, 0.3)',
                  flexShrink: 0
                }}>
                  {m.tag}
                </span>
              </div>
            );
          })}
        </div>

        {/* Warning notification if ConvGRU selected while checkpoint is missing */}
        {selectedModel === 'CONVGRU' && !isTrained && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            borderRadius: '5px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.68rem',
            lineHeight: '1.3'
          }}>
            <strong>TRAINED MODEL NOT AVAILABLE</strong>
            <br />
            ConvGRU checkpoint <code>backend/models/convgru_best.pt</code> has not been uploaded yet. Forecast displays baseline Optical Flow motion without unverified neural weights.
          </div>
        )}
      </div>
    </div>
  );
}
