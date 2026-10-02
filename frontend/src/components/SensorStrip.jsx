import React from 'react';
import { 
  Satellite, 
  Radio, 
  Wind, 
  Zap, 
  CloudRain, 
  AlertTriangle,
  Bell
} from 'lucide-react';

export default function SensorStrip({
  sensorStatus = {},
  mode = 'replay',
  isDwrReplay = true,
  onToggleSensor,
  currentTimestamp = null
}) {
  const isLive = mode === 'live';

  // Format timestamp for display (e.g., 2019-11-07 04:10)
  const formatTs = (isoStr, minuteOffset = 0) => {
    if (!isoStr) return '2019-11-07 03:00';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr.substring(0, 16).replace('T', ' ');
      if (minuteOffset !== 0) {
        d.setUTCMinutes(d.getUTCMinutes() + minuteOffset);
      }
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const h = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}`;
    } catch {
      return '2019-11-07 03:00';
    }
  };

  const tsStr = currentTimestamp || '2019-11-07T03:00:00Z';

  // Sensor definitions matching the reference image
  const sensors = [
    {
      id: 'insat',
      name: 'INSAT-3D',
      icon: Satellite,
      status: isLive ? 'LIVE' : (sensorStatus.insat === 'available' ? 'REPLAY' : 'UNAVAILABLE'),
      timestamp: formatTs(tsStr, 0)
    },
    {
      id: 'dwr',
      name: 'DWR (TERLS)',
      icon: Radio,
      status: isLive ? 'LIVE' : (isDwrReplay ? 'REPLAY' : 'UNAVAILABLE'),
      timestamp: formatTs(tsStr, 0)
    },
    {
      id: 'era5',
      name: 'ERA5',
      icon: Wind,
      status: sensorStatus.era5 === 'available' ? 'AVAILABLE' : 'UNAVAILABLE',
      // ERA5 reanalysis is synchronized to the hourly assimilation cycle
      timestamp: formatTs(tsStr, - (new Date(tsStr).getUTCMinutes() || 0))
    },
    {
      id: 'lightning',
      name: 'Lightning',
      icon: Zap,
      status: sensorStatus.lightning === 'available' ? 'AVAILABLE' : 'UNAVAILABLE',
      timestamp: formatTs(tsStr, 0)
    },
    {
      id: 'imerg',
      name: 'IMERG',
      icon: CloudRain,
      status: sensorStatus.imerg === 'available' ? 'AVAILABLE' : 'UNAVAILABLE',
      timestamp: formatTs(tsStr, -10)
    },
    {
      id: 'imd_nowcast',
      name: 'IMD Nowcast',
      icon: AlertTriangle,
      status: 'AVAILABLE',
      timestamp: formatTs(tsStr, 0)
    },
    {
      id: 'imd_warnings',
      name: 'IMD Warnings',
      icon: Bell,
      status: 'AVAILABLE',
      timestamp: formatTs(tsStr, 0)
    }
  ];

  const getBadgeStyle = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: '#DCFCE7',
          border: '#86EFAC',
          color: '#15803D'
        };
      case 'LIVE':
        return {
          bg: '#DCFCE7',
          border: '#86EFAC',
          color: '#15803D'
        };
      case 'REPLAY':
        return {
          bg: '#DBEAFE',
          border: '#93C5FD',
          color: '#1E40AF'
        };
      default:
        return {
          bg: '#F1F5F9',
          border: '#CBD5E1',
          color: '#64748B'
        };
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 16px',
      background: '#F5F7FA',
      borderBottom: '1px solid #E2E8F0',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      zIndex: 30,
      flexShrink: 0
    }}>
      {sensors.map(s => {
        const Icon = s.icon;
        const badge = getBadgeStyle(s.status);
        return (
          <div
            key={s.id}
            onClick={() => onToggleSensor?.(s.id)}
            title={`Sensor: ${s.name} | Status: ${s.status} | Time: ${s.timestamp}`}
            className="box-card-interactive"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              flexShrink: 0
            }}
          >
            {/* Icon Box */}
            <div className="box-icon-container">
              <Icon size={14} strokeWidth={2.2} />
            </div>

            {/* Label + Badge + Timestamp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  {s.name}
                </span>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '1.5px 6px',
                  borderRadius: '4px',
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.color
                }}>
                  {s.status}
                </span>
              </div>
              <span style={{ fontSize: '9.5px', color: '#64748B', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {s.timestamp}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
