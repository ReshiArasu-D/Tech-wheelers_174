import React from 'react';
import { CloudLightning, Satellite, ShieldAlert, Activity, Database } from 'lucide-react';

export default function Header({ eventInfo, currentTimestamp, provenanceBadge, sensorStatus, activeAlertCount, onOpenAlertModal }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'rgba(10, 15, 26, 0.95)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000
    }}>
      {/* Title & Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
        }}>
          <CloudLightning size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              CO-NOWCAST
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }} className="badge-production">
              SIH 2026 PS-26084
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)
          </p>
        </div>
      </div>

      {/* Provenance & Scientific Honesty Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 14px',
        borderRadius: '8px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px' }} className="badge-real">
              REAL DATA
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px' }} className="badge-proxy">
              PROTOTYPE SENSOR FUSION
            </span>
            <span style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>
              INSAT-3D + ERA5 Replay
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
            Model: <strong style={{ color: '#38bdf8' }}>{provenanceBadge?.model || 'ConvGRU Residual + Optical Flow'}</strong> | Res: <strong style={{ color: '#cbd5e1' }}>3.7 km native</strong>
          </div>
        </div>
      </div>

      {/* Alerts & Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Analysis Timestamp
          </div>
          <div className="mono" style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
            {currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : 'LIVE SYNOPTIC'}
          </div>
        </div>

        {activeAlertCount > 0 && (
          <button
            onClick={onOpenAlertModal}
            className="badge-alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              border: 'none',
              outline: 'none'
            }}
          >
            <ShieldAlert size={16} />
            {activeAlertCount} Alert Candidate{activeAlertCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </header>
  );
}
