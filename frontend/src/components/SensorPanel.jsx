import React from 'react';
import { Satellite, Wind, Radio, Zap, CloudRain, AlertTriangle, Info } from 'lucide-react';

export default function SensorPanel({
  sensorStatus = {},
  onToggleSensor,
  uncertaintyMetrics = {}
}) {
  // 5 Data Sources per SIH 26084 Frozen Architecture
  const sensors = [
    {
      id: 'insat',
      name: 'INSAT-3D/3DR',
      desc: 'TIR1 (10.8 µm) & Cooling Rate',
      icon: Satellite,
      status: sensorStatus.insat === 'unavailable' ? 'UNAVAILABLE' : 'REPLAY',
      badgeClass: sensorStatus.insat === 'unavailable' ? 'badge-alert' : 'badge-real',
      note: '3.7 km native resolution; 30-min rapid scan sequence'
    },
    {
      id: 'era5',
      name: 'ERA5 Reanalysis',
      desc: 'CAPE / PW / 0-6km Shear',
      icon: Wind,
      status: sensorStatus.era5 === 'unavailable' ? 'UNAVAILABLE' : 'CONNECTED',
      badgeClass: sensorStatus.era5 === 'unavailable' ? 'badge-alert' : 'badge-real',
      note: 'Atmospheric stability & shear sounding proxy'
    },
    {
      id: 'imerg',
      name: 'GPM IMERG',
      desc: 'Early Half-Hourly Rain Field',
      icon: CloudRain,
      status: sensorStatus.imerg === 'unavailable' ? 'UNAVAILABLE' : 'PARTIAL',
      badgeClass: sensorStatus.imerg === 'unavailable' ? 'badge-alert' : 'badge-proxy',
      note: 'Calibrated precipitation rate accumulation'
    },
    {
      id: 'dwr',
      name: 'DWR / Radar',
      desc: 'Reflectivity & Radial Vel.',
      icon: Radio,
      status: sensorStatus.dwr === 'replay'
        ? 'REPLAY'
        : sensorStatus.dwr === 'available'
          ? 'CONNECTED'
          : 'UNAVAILABLE',
      badgeClass: sensorStatus.dwr === 'replay' || sensorStatus.dwr === 'available'
        ? 'badge-real'
        : 'badge-alert',
      note: sensorStatus.dwr === 'replay'
        ? 'TERLS C-band DWR · Indian ConvGRU · 15 real sequences · 2019-11-07'
        : 'Doppler velocity & 1km grid (awaiting live feed)',
    },
    {
      id: 'lightning',
      name: 'Lightning Network',
      desc: 'Ground Strike Flash Density',
      icon: Zap,
      status: sensorStatus.lightning === 'available' ? 'CONNECTED' : 'UNAVAILABLE',
      badgeClass: sensorStatus.lightning === 'available' ? 'badge-real' : 'badge-alert',
      note: 'Direct ground network unavailable; cloud glaciation proxy active'
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '14px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.03em' }}>
          SENSOR INGESTION STATUS
        </h3>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}
              className={sensorStatus.dwr === 'replay' || sensorStatus.dwr === 'available' ? 'badge-real' : 'badge-proxy'}>
          {sensorStatus.dwr === 'replay' ? 'DWR HISTORICAL REPLAY ACTIVE' : (sensorStatus.mode_label || 'REDUCED SENSOR FUSION')}
        </span>
      </div>

      {/* Sensor checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sensors.map((s) => {
          const Icon = s.icon;
          const isLiveOrReplay = s.status === 'CONNECTED' || s.status === 'REPLAY' || s.status === 'PARTIAL';
          const isUnavailable = s.status === 'UNAVAILABLE';

          return (
            <div
              key={s.id}
              onClick={() => onToggleSensor && onToggleSensor(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '6px',
                background: isUnavailable
                  ? 'rgba(239, 68, 68, 0.06)'
                  : (s.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)'),
                border: `1px solid ${
                  isUnavailable
                    ? 'rgba(239, 68, 68, 0.3)'
                    : (s.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)')
                }`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={`Click to simulate sensor dropout toggle for ${s.name}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={16} color={
                  isUnavailable ? '#94a3b8' : (s.status === 'PARTIAL' ? '#fbbf24' : '#34d399')
                } />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnavailable ? '#94a3b8' : '#f8fafc' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                    {s.desc}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: "'JetBrains Mono', monospace",
                  background: isUnavailable
                    ? 'rgba(239, 68, 68, 0.2)'
                    : (s.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
                  color: isUnavailable
                    ? '#f87171'
                    : (s.status === 'PARTIAL' ? '#fbbf24' : '#34d399')
                }}>
                  {s.status}
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
