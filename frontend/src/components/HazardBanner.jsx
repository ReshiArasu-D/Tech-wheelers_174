import React from 'react';
import { X, AlertTriangle, Zap, CloudLightning, AlertCircle, Droplets, CloudRain, Wind } from 'lucide-react';

export default function HazardBanner({
  selectedHazard,
  onClearHazard
}) {
  if (!selectedHazard) return null;

  const config = {
    lightning: {
      label: 'LIGHTNING HAZARD VIEW',
      bg: 'linear-gradient(90deg, #6b21a8 0%, #9333ea 50%, #7e22ce 100%)',
      border: '#c084fc',
      icon: Zap,
    },
    thunderstorm: {
      label: 'THUNDERSTORM HAZARD VIEW',
      bg: 'linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #9a3412 100%)',
      border: '#fb923c',
      icon: CloudLightning,
    },
    hail: {
      label: 'HAIL HAZARD VIEW',
      bg: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)',
      border: '#60a5fa',
      icon: AlertCircle,
    },
    heavy_rain: {
      label: 'HEAVY RAIN HAZARD VIEW',
      bg: 'linear-gradient(90deg, #0e7490 0%, #0891b2 50%, #155e75 100%)',
      border: '#22d3ee',
      icon: Droplets,
    },
    cloudburst: {
      label: 'CLOUDBURST HAZARD VIEW',
      bg: 'linear-gradient(90deg, #b45309 0%, #d97706 50%, #92400e 100%)',
      border: '#fcd34d',
      icon: CloudRain,
    },
    downburst: {
      label: 'DOWNBURST HAZARD VIEW',
      bg: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)',
      border: '#f87171',
      icon: Wind,
    }
  };

  const item = config[selectedHazard] || {
    label: `${selectedHazard.toUpperCase()} HAZARD VIEW`,
    bg: 'linear-gradient(90deg, #0369a1 0%, #0284c7 100%)',
    border: '#38bdf8',
    icon: AlertTriangle
  };

  const Icon = item.icon;

  return (
    <div style={{
      width: '100%',
      height: '32px',
      background: item.bg,
      borderTop: `1px solid ${item.border}`,
      borderBottom: `1px solid ${item.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      color: '#ffffff',
      fontWeight: 800,
      letterSpacing: '0.08em',
      fontSize: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      zIndex: 15
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={16} color="#ffffff" />
        <span>{item.label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 600, opacity: 0.9 }}>
          Primary Map Layer & Right Telemetry Synchronized
        </span>
        <button
          onClick={onClearHazard}
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#ffffff',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <X size={11} /> Reset View
        </button>
      </div>
    </div>
  );
}
