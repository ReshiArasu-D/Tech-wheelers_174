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
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.header-dropdown-container')) {
        setModelMenuOpen(false);
        setRegionMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
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
        border: '1px solid #CBD5E1',
        borderRadius: '8px',
        padding: '3px',
        gap: '2px',
        boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)'
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
              className="box-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 14px',
                borderRadius: '6px',
                background: isActive ? '#2563EB' : 'transparent',
                border: isActive ? '1px solid #1D4ED8' : '1px solid transparent',
                color: isActive ? '#FFFFFF' : '#475569',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  background: '#DC2626',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Real Backend / Meteorological Timestamp Box */}
        <div 
          className="box-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            padding: '3px 8px',
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '6px'
          }}
        >
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0F172A',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.01em'
          }}>
            {formatDisplayTimestamp()}
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: mode === 'live' ? '#16A34A' : '#2563EB',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: mode === 'live' ? '#16A34A' : '#2563EB'
            }} />
            {mode === 'live' ? 'Live Stream' : 'Historical Replay'}
          </div>
        </div>

        {/* Model Custom Dropdown */}
        <div className="header-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModelMenuOpen(!modelMenuOpen);
              setRegionMenuOpen(false);
            }}
            className="box-btn"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>
              {selectedModel === 'CONVGRU' ? 'Model: ConvGRU (Trained)' :
               selectedModel === 'OPTICAL_FLOW' ? 'Model: Optical Flow (TV-L1)' :
               'Model: Persistence Baseline'}
            </span>
            <ChevronDown size={13} color="#64748B" />
          </button>

          {modelMenuOpen && (
            <div
              className="box-card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                minWidth: '220px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.15)',
                zIndex: 1000,
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              {[
                { value: 'CONVGRU', label: 'Model: ConvGRU (Trained)' },
                { value: 'OPTICAL_FLOW', label: 'Model: Optical Flow (TV-L1)' },
                { value: 'PERSISTENCE', label: 'Model: Persistence Baseline' }
              ].map(opt => (
                <div
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectModel?.(opt.value);
                    setModelMenuOpen(false);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: selectedModel === opt.value ? 700 : 500,
                    background: selectedModel === opt.value ? '#EFF6FF' : 'transparent',
                    color: selectedModel === opt.value ? '#2563EB' : '#0F172A',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedModel !== opt.value) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedModel !== opt.value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Region Custom Dropdown */}
        <div className="header-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRegionMenuOpen(!regionMenuOpen);
              setModelMenuOpen(false);
            }}
            className="box-btn"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>
              {selectedRegion === 'TERLS' ? 'Region: Kerala (TERLS Radar)' :
               selectedRegion === 'India' ? 'Region: India (National)' :
               selectedRegion === 'Odisha' ? 'Region: Odisha / Bhubaneswar' :
               'Region: Bay of Bengal Convective'}
            </span>
            <ChevronDown size={13} color="#64748B" />
          </button>

          {regionMenuOpen && (
            <div
              className="box-card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '240px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.15)',
                zIndex: 1000,
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              {[
                { value: 'TERLS', label: 'Region: Kerala (TERLS Radar)' },
                { value: 'India', label: 'Region: India (National)' },
                { value: 'Odisha', label: 'Region: Odisha / Bhubaneswar' },
                { value: 'Bengal', label: 'Region: Bay of Bengal Convective' }
              ].map(opt => (
                <div
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRegion?.(opt.value);
                    setRegionMenuOpen(false);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: selectedRegion === opt.value ? 700 : 500,
                    background: selectedRegion === opt.value ? '#EFF6FF' : 'transparent',
                    color: selectedRegion === opt.value ? '#2563EB' : '#0F172A',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRegion !== opt.value) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRegion !== opt.value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Sources Button */}
        <button
          onClick={onOpenDataSources}
          title="Data Sources & Provenance"
          className="box-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#2563EB'
          }}
        >
          <Database size={13} strokeWidth={2.2} />
          <span>Data Sources</span>
        </button>

        {/* AI Copilot — prominent visible entry point */}
        <button
          onClick={onOpenChatDrawer}
          title="AI Nowcast Copilot"
          className="box-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            border: '1px solid #6D28D9',
            borderRadius: '7px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            letterSpacing: '0.01em'
          }}
        >
          <Bot size={14} strokeWidth={2.2} />
          <span>AI Copilot</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenAlertModal}
          title="Alert Candidates"
          className="box-btn"
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569'
          }}
        >
          <Bell size={15} strokeWidth={2.2} />
          {activeAlertCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '8.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)'
            }}>
              {activeAlertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
