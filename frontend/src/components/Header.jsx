import React, { useState, useEffect } from 'react';
import { 
  CloudLightning, 
  Bell, 
  Settings, 
  Bot, 
  Database,
  Layers, 
  Activity, 
  FileText, 
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

export default function Header({
  mode = 'replay', // 'live' | 'replay'
  onSelectMode,
  selectedModel = 'CONVGRU',
  onSelectModel,
  selectedRegion = 'TERLS',
  onSelectRegion,
  activeAlertCount = 1,
  onOpenAlertModal,
  onOpenSummaryModal,
  onOpenChatDrawer,
  onOpenDataSources,
  currentTimestamp = null,
  dwrReplayInfo = null
}) {
  const [currentClock, setCurrentClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format meteorological replay timestamp if in replay mode
  const formatDisplayTimestamp = () => {
    if (mode === 'replay' && currentTimestamp) {
      try {
        const d = new Date(currentTimestamp);
        if (!isNaN(d.getTime())) {
          const day = String(d.getUTCDate()).padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[d.getUTCMonth()];
          const year = d.getUTCFullYear();
          const hours = String(d.getUTCHours()).padStart(2, '0');
          const mins = String(d.getUTCMinutes()).padStart(2, '0');
          const secs = String(d.getUTCSeconds()).padStart(2, '0');
          return `${day} ${month} ${year}, ${hours}:${mins}:${secs} UTC`;
        }
      } catch (e) {
        // fallback
      }
    }
    // Fallback to real system clock UTC
    const hours = String(currentClock.getUTCHours()).padStart(2, '0');
    const mins = String(currentClock.getUTCMinutes()).padStart(2, '0');
    const secs = String(currentClock.getUTCSeconds()).padStart(2, '0');
    const day = String(currentClock.getUTCDate()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[currentClock.getUTCMonth()];
    const yr = currentClock.getUTCFullYear();
    return `${day} ${mon} ${yr}, ${hours}:${mins}:${secs} UTC`;

  };

  const navItems = [
    { id: 'live', label: 'Live' },
    { id: 'replay', label: 'Replay' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
    { id: 'alerts', label: 'Alerts', badge: activeAlertCount }
  ];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 18px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      height: '52px',
      flexShrink: 0,
      zIndex: 100,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
    }}>
      {/* LEFT: Logo + Title + Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '7px',
          background: '#2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
        }}>
          <CloudLightning size={18} strokeWidth={2.5} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ 
              fontSize: '1.05rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              CO-NOWCAST
            </h1>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
            Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)
          </p>
        </div>
      </div>

      {/* CENTER: Navigation pills (Live / Replay / Analytics / Reports / Alerts) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#F1F5F9',
        border: '1px solid #E2E8F0',
        borderRadius: '7px',
        padding: '2px'
      }}>
        {navItems.map(item => {
          const isActive = (item.id === 'live' && mode === 'live') || 
                           (item.id === 'replay' && mode === 'replay');
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'live' || item.id === 'replay') {
                  onSelectMode?.(item.id);
                } else if (item.id === 'alerts') {
                  onOpenAlertModal?.();
                } else if (item.id === 'reports' || item.id === 'analytics') {
                  onOpenSummaryModal?.();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 14px',
                borderRadius: '5px',
                background: isActive ? '#2563EB' : 'transparent',
                border: 'none',
                color: isActive ? '#FFFFFF' : '#475569',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  background: isActive ? '#DC2626' : '#DC2626',
                  color: '#FFFFFF',
                  padding: '1px 5px',
                  borderRadius: '10px'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT: Timestamp + Model + Region + Data Sources + Bell + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Real Backend / Meteorological Timestamp */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginRight: '4px'
        }}>
          <div style={{
            fontSize: '0.80rem',
            fontWeight: 700,
            color: '#0F172A',
            fontFamily: 'monospace',
            letterSpacing: '-0.01em'
          }}>
            {formatDisplayTimestamp()}
          </div>
          <div style={{
            fontSize: '0.66rem',
            color: '#2563EB',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: mode === 'live' ? '#16A34A' : '#2563EB'
            }} />
            {mode === 'live' ? 'Live Stream' : 'Historical Replay'}
          </div>
        </div>

        {/* Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel?.(e.target.value)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '0.73rem',
            fontWeight: 600,
            color: '#0F172A',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <option value="CONVGRU">Model: ConvGRU (Trained)</option>
          <option value="OPTICAL_FLOW">Model: Optical Flow (TV-L1)</option>
          <option value="PERSISTENCE">Model: Persistence Baseline</option>
        </select>

        {/* Region Selector */}
        <select
          value={selectedRegion}
          onChange={(e) => onSelectRegion?.(e.target.value)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '0.73rem',
            fontWeight: 600,
            color: '#0F172A',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <option value="TERLS">Region: Kerala (TERLS Radar)</option>
          <option value="India">Region: India (National)</option>
          <option value="Odisha">Region: Odisha / Bhubaneswar</option>
          <option value="Bengal">Region: Bay of Bengal Convective</option>
        </select>

        {/* Data Sources Button */}
        <button
          onClick={onOpenDataSources}
          title="Data Sources & Provenance"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '5px 9px',
            fontSize: '0.73rem',
            fontWeight: 600,
            color: '#2563EB',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <Database size={13} />
          <span>Data Sources</span>
        </button>

        {/* AI Copilot — prominent visible entry point */}
        <button
          onClick={onOpenChatDrawer}
          title="AI Nowcast Copilot"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            border: '1px solid #7C3AED',
            borderRadius: '6px',
            padding: '5px 11px',
            fontSize: '0.73rem',
            fontWeight: 700,
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
            letterSpacing: '0.01em'
          }}
        >
          <Bot size={13} />
          <span>AI Copilot</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenAlertModal}
          title="Alert Candidates"
          style={{
            position: 'relative',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <Bell size={15} />
          {activeAlertCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '8px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeAlertCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar (matching circle 'R' in reference) */}
        <div 
          onClick={onOpenChatDrawer}
          title="Operator Profile / AI Assistant"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#2563EB',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
          }}
        >
          R
        </div>
      </div>
    </header>
  );
}
