import React from 'react';
import { ShieldCheck, AlertOctagon, Navigation, MapPin } from 'lucide-react';

export default function RiskAndArrivalPanel({
  risk = {},
  arrival = {}
}) {
  const getRiskColor = (score) => {
    if (score >= 75) return '#ef4444'; // Red
    if (score >= 50) return '#f59e0b'; // Amber
    if (score >= 30) return '#38bdf8'; // Cyan
    return '#10b981'; // Green
  };

  const riskScore = risk.overall_risk_score || 0;
  const riskColor = getRiskColor(riskScore);

  return (
    <div className="glass-panel" style={{ padding: '14px' }}>
      {/* Risk Engine Header & Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
            OPERATIONAL RISK & ARRIVAL ENGINE
          </h3>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            Integrated multi-hazard severity, exposure & contour leading-edge ETA
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '4px 10px',
          borderRadius: '6px',
          border: `1px solid ${riskColor}`
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>RISK SCORE</div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: riskColor }}>
              {riskScore.toFixed(1)}/100
            </div>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${riskColor}22`,
            color: riskColor
          }}>
            {risk.risk_level || 'NOMINAL'}
          </span>
        </div>
      </div>

      {/* Target Arrival Countdowns */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={12} />
          <span>LOCATION-SPECIFIC HAZARD ARRIVAL COUNTDOWNS:</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
          {Object.values(arrival).map((target) => {
            const hasArrival = target.estimated_arrival_minutes !== null;
            const isImminent = hasArrival && target.estimated_arrival_minutes <= 60.0;

            return (
              <div
                key={target.target_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: isImminent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${isImminent ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color={isImminent ? '#f87171' : '#38bdf8'} />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                      {target.target_name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                      Confidence: <strong style={{ color: '#cbd5e1' }}>{target.confidence}</strong> | Impact Prob: <strong style={{ color: '#38bdf8' }}>{(target.impact_probability * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isImminent ? '#f87171' : (hasArrival ? '#38bdf8' : '#94a3b8')
                  }}>
                    {target.countdown_display}
                  </div>
                  {hasArrival && (
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                      ≈ {target.estimated_arrival_minutes.toFixed(0)} min lead time
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
