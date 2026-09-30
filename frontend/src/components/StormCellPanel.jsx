import React from 'react';
import { X, Navigation, Thermometer, Wind, Activity, Zap, ShieldAlert, Layers } from 'lucide-react';

export default function StormCellPanel({ storm, era5Context = {}, onClose }) {
  if (!storm) return null;

  const minTb = storm.min_tb_k || 210.0;
  const coolingRate = storm.cooling_rate_k_hr || 4.0;
  const speed = storm.motion?.speed_kmh || 0;
  const dir = storm.motion?.direction_deg || 0;
  const bearing = storm.motion?.bearing_cardinal || 'NE';
  const cLat = storm.centroid?.lat || 0;
  const cLon = storm.centroid?.lon || 0;
  const area = storm.area_km2 || 0;
  const lineage = storm.lineage_type || 'GENESIS';

  // Determine lifecycle phase from cooling rate & intensity
  let lifecycle = 'MATURE';
  let lifecycleColor = '#38bdf8';
  if (coolingRate > 5.0) {
    lifecycle = 'INTENSIFYING';
    lifecycleColor = '#f43f5e';
  } else if (coolingRate < 0.5) {
    lifecycle = 'DISSIPATING';
    lifecycleColor = '#94a3b8';
  }

  // Get CAPE from context if available
  const cape = era5Context?.parameters?.cape_j_kg?.mean || 2200;

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '24px',
      width: '320px',
      background: 'rgba(10, 15, 26, 0.96)',
      border: '1px solid rgba(56, 189, 248, 0.35)',
      boxShadow: '0 4px 25px rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(12px)',
      borderRadius: '10px',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(15, 23, 42, 0.85)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: lifecycleColor,
            boxShadow: `0 0 8px ${lifecycleColor}`
          }} />
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
            {storm.storm_id}
          </span>
          <span className="badge-proxy" style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
            {lineage}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Grid Stats */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Row 1: Position & Motion */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            padding: '6px 8px',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>Position</div>
            <div className="mono" style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
              {cLat.toFixed(2)}°N, {cLon.toFixed(2)}°E
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            padding: '6px 8px',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>Motion Vector</div>
            <div className="mono" style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>
              → {speed.toFixed(1)} km/h ({bearing})
            </div>
          </div>
        </div>

        {/* Row 2: Cloud Top & Cooling Rate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            padding: '6px 8px',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>Min Cloud-Top Tb</div>
            <div className="mono" style={{ fontSize: '0.82rem', color: minTb < 205 ? '#f43f5e' : '#38bdf8', fontWeight: 700 }}>
              {minTb.toFixed(1)} K
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            padding: '6px 8px',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cooling Rate</div>
            <div className="mono" style={{ fontSize: '0.82rem', color: coolingRate > 4 ? '#f43f5e' : '#cbd5e1', fontWeight: 600 }}>
              -{coolingRate.toFixed(1)} K/hr
            </div>
          </div>
        </div>

        {/* Row 3: Lifecycle, CAPE & Area */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(56, 189, 248, 0.12)',
          padding: '8px 10px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>LIFECYCLE PHASE</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: lifecycleColor }}>
              {lifecycle}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>ERA5 CAPE</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc' }}>
              {cape.toFixed(0)} J/kg
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>AREA</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
              {area.toLocaleString()} km²
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
