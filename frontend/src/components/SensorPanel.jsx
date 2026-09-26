import React from 'react';
import { Satellite, Wind, Radio, Zap, AlertTriangle } from 'lucide-react';

export default function SensorPanel({
  sensorStatus = {},
  onToggleSensor,
  uncertaintyMetrics = {}
}) {
  const sensors = [
    {
      id: 'insat',
      name: 'INSAT-3D/3DR TIR1',
      desc: 'Thermal Infrared (10.8 µm)',
      icon: Satellite,
      available: sensorStatus.insat === 'available',
      badge: 'REAL DATA (3.7 km)'
    },
    {
      id: 'era5',
      name: 'ERA5 Environmental',
      desc: 'CAPE / PW / Wind Shear',
      icon: Wind,
      available: sensorStatus.era5 === 'available',
      badge: 'REANALYSIS CONTEXT'
    },
    {
      id: 'dwr',
      name: 'DWR Doppler Radar',
      desc: 'Reflectivity & Radial Vel.',
      icon: Radio,
      available: sensorStatus.dwr === 'available',
      badge: 'PRODUCTION REQUIRED'
    },
    {
      id: 'lightning',
      name: 'Ground Lightning Net',
      desc: 'Flash Density & Rate',
      icon: Zap,
      available: sensorStatus.lightning === 'available',
      badge: 'PRODUCTION REQUIRED'
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.02em' }}>
          SENSOR AVAILABILITY MASK
        </h3>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}
              className={sensorStatus.dwr === 'available' ? 'badge-real' : 'badge-proxy'}>
          {sensorStatus.mode_label || 'PROTOTYPE: REDUCED FUSION'}
        </span>
      </div>

      {/* Sensor checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sensors.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => onToggleSensor(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '6px',
                background: s.available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                border: `1px solid ${s.available ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={`Click to simulate sensor dropout for ${s.name}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={16} color={s.available ? '#34d399' : '#94a3b8'} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.available ? '#f8fafc' : '#94a3b8' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {s.desc}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: s.available ? '#34d399' : '#f87171'
                }}>
                  {s.available ? '● AVAILABLE' : '○ UNAVAILABLE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Dropout Notice */}
      <div style={{
        marginTop: '10px',
        padding: '6px 8px',
        borderRadius: '5px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.68rem',
        color: '#fbbf24'
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        <span>
          Click any sensor to simulate dropout. Notice dynamic uncertainty expansion and confidence degradation.
        </span>
      </div>
    </div>
  );
}
