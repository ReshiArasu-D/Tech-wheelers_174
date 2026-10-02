import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, X, Copy, Check, RefreshCw, AlertTriangle, ShieldCheck, 
  Clock, Compass, CloudLightning, Activity, AlertCircle, FileText, TrendingUp,
  Sun, Moon
} from 'lucide-react';
import gsap from 'gsap';
import { api } from '../services/api';
import FormattedText from './FormattedText';

export default function AiSummaryModal({
  isOpen,
  onClose,
  stormState,
  selectedHorizon,
  selectedModel,
  currentTimestamp
}) {
  const [summaryData, setSummaryData] = useState(null);
  const [loadedTimestamp, setLoadedTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('light'); // 'light' (default) | 'dark'

  const backdropRef = useRef(null);
  const modalRef = useRef(null);

  const isLight = theme === 'light';

  const fetchSummary = async (targetTs) => {
    setIsLoading(true);
    setError(null);
    const tsToUse = targetTs || currentTimestamp || stormState?.timestamp;
    try {
      const payload = {
        event_id: stormState?.event_id || 'EVENT-20191107-BOB-01',
        timestamp: tsToUse,
        selected_horizon: selectedHorizon || 'NOW',
        selected_model: selectedModel || 'CONVGRU',
        dashboard_context: stormState
      };
      const res = await api.getAiSummary(payload);
      setSummaryData(res);
      setLoadedTimestamp(tsToUse);
    } catch (err) {
      console.error('Error fetching AI summary:', err);
      setError(err.message || 'Failed to generate operational summary.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on modal opening
  useEffect(() => {
    if (isOpen) {
      if (!summaryData || loadedTimestamp === null) {
        fetchSummary(currentTimestamp);
      }
    } else {
      setLoadedTimestamp(null);
      setSummaryData(null);
    }
  }, [isOpen, selectedHorizon, selectedModel]);

  // GSAP entrance animation when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: 'power2.out' }
        );

        gsap.fromTo(modalRef.current,
          { opacity: 0, scale: 0.90, y: 25 },
          { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.15)' }
        );
      }, modalRef);

      return () => ctx.revert();
    }
  }, [isOpen]);

  // Check if live/replay time has changed while user is reading
  const hasTimeChanged = Boolean(
    loadedTimestamp && 
    currentTimestamp && 
    loadedTimestamp !== currentTimestamp
  );

  const handleCopy = () => {
    if (!summaryData?.full_markdown) return;
    navigator.clipboard.writeText(summaryData.full_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const sectionIcons = [
    Activity,         // Current Situation
    CloudLightning,   // Main Hazards
    TrendingUp,       // Near-term Outlook
    Compass,          // 6-Hour Outlook
    ShieldCheck,      // Risk / Arrival
    AlertTriangle     // Recommended Operator Attention
  ];

  return (
    <div 
      ref={backdropRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isLight ? 'rgba(15, 23, 42, 0.48)' : 'rgba(2, 6, 12, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          background: isLight ? '#FFFFFF' : '#0F172A',
          border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
          boxShadow: isLight 
            ? '0 25px 60px -12px rgba(15, 23, 42, 0.22), 0 10px 24px -4px rgba(15, 23, 42, 0.08)' 
            : '0 25px 60px -12px rgba(0, 0, 0, 0.65)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
          background: isLight ? '#FFFFFF' : '#1E293B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}>
              <Sparkles size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ 
                  fontSize: '1.08rem', 
                  fontWeight: 800, 
                  color: isLight ? '#0F172A' : '#F8FAFC', 
                  letterSpacing: '-0.01em' 
                }}>
                  AI OPERATIONAL NOWCAST SUMMARY
                </h2>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  padding: '3px 8px', 
                  borderRadius: '4px',
                  background: isLight ? '#EFF6FF' : 'rgba(56, 189, 248, 0.15)',
                  color: isLight ? '#1D4ED8' : '#38BDF8',
                  border: isLight ? '1px solid #BFDBFE' : '1px solid rgba(56, 189, 248, 0.3)',
                  letterSpacing: '0.03em'
                }}>
                  DECISION-SUPPORT ONLY
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
                Synthesized directly from active sensor telemetry, Farneback optical flow, and calibrated proxy heads
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              title={`Switch to ${isLight ? 'Dark' : 'Light'} Theme`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                background: isLight ? '#F1F5F9' : '#334155',
                border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                borderRadius: '8px',
                color: isLight ? '#334155' : '#F1F5F9',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isLight ? <Moon size={13} color="#2563EB" /> : <Sun size={13} color="#FBBF24" />}
              <span>{isLight ? 'Dark' : 'Light'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchSummary(currentTimestamp)}
              disabled={isLoading}
              title="Re-generate operational summary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: isLight ? '#F8FAFC' : '#1E293B',
                border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                borderRadius: '8px',
                color: isLight ? '#334155' : '#CBD5E1',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = isLight ? '#EFF6FF' : '#334155';
                  e.currentTarget.style.borderColor = isLight ? '#93C5FD' : '#475569';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = isLight ? '#F8FAFC' : '#1E293B';
                  e.currentTarget.style.borderColor = isLight ? '#CBD5E1' : '#334155';
                }
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin-anim' : ''} />
              <span>Refresh</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Summary"
              style={{
                background: isLight ? '#F8FAFC' : 'transparent',
                border: isLight ? '1px solid #E2E8F0' : 'none',
                color: isLight ? '#64748B' : '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isLight ? '#0F172A' : '#FFFFFF';
                e.currentTarget.style.background = isLight ? '#E2E8F0' : '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isLight ? '#64748B' : '#94A3B8';
                e.currentTarget.style.background = isLight ? '#F8FAFC' : 'transparent';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Telemetry Context Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 22px',
          background: isLight ? '#EFF6FF' : '#111827',
          borderBottom: isLight ? '1px solid #DBEAFE' : '1px solid #1F2937',
          fontSize: '0.74rem',
          color: isLight ? '#1E40AF' : '#94A3B8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              Report Timestamp: <span className="mono" style={{ color: isLight ? '#2563EB' : '#38BDF8', fontWeight: 700 }}>
                {loadedTimestamp ? loadedTimestamp.replace('T', ' ').replace('Z', ' UTC') : (currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : 'CURRENT FRAME')}
              </span>
            </div>
            <div>
              Horizon: <span style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 700 }}>{selectedHorizon}</span>
            </div>
            <div>
              Model: <span style={{ color: '#16A34A', fontWeight: 700 }}>{selectedModel}</span>
            </div>
          </div>

          {hasTimeChanged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563EB' }} />
              <span style={{ fontSize: '0.70rem', color: isLight ? '#1E40AF' : '#93C5FD', fontWeight: 700 }}>
                Newer Time Available
              </span>
            </div>
          )}
        </div>

        {/* Live Time Changed Notification Banner */}
        {hasTimeChanged && !isLoading && (
          <div style={{
            margin: '10px 22px 0 22px',
            padding: '9px 14px',
            borderRadius: '10px',
            background: isLight ? '#EFF6FF' : 'rgba(30, 58, 138, 0.35)',
            border: isLight ? '1.5px solid #93C5FD' : '1.5px solid #3B82F6',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
              <span style={{ 
                fontSize: '0.80rem', 
                fontWeight: 700, 
                color: isLight ? '#1E40AF' : '#93C5FD' 
              }}>
                Live time changed. See current report
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                color: isLight ? '#2563EB' : '#60A5FA',
                background: isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : ''}
              </span>
            </div>

            <button
              onClick={() => fetchSummary(currentTimestamp)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'}
            >
              <RefreshCw size={12} />
              <span>Update Report</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div style={{
          padding: '16px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: isLight ? '#F8FAFC' : '#0B1120'
        }}>
          {isLoading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: isLight ? '3px solid #BFDBFE' : '3px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: '#2563EB',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px auto'
              }} />
              <div style={{ fontSize: '0.94rem', color: isLight ? '#0F172A' : '#F1F5F9', fontWeight: 800 }}>
                Generating Operational Synthesis...
              </div>
              <div style={{ fontSize: '0.78rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '4px' }}>
                Analyzing cell tracking, 6-hazard convective heads, and coastal arrival corridors
              </div>
            </div>
          ) : error ? (
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
              border: isLight ? '1px solid #FCA5A5' : '1px solid rgba(239, 68, 68, 0.3)',
              color: isLight ? '#DC2626' : '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} color="#DC2626" />
              <div>
                <div style={{ fontWeight: 800 }}>Synthesis Generation Error</div>
                <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{error}</div>
              </div>
            </div>
          ) : summaryData ? (
            summaryData.sections.map((sec, idx) => {
              const IconComp = sectionIcons[idx] || FileText;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '15px 18px',
                    borderRadius: '12px',
                    background: isLight ? '#FFFFFF' : '#1E293B',
                    border: isLight ? '1px solid #E2E8F0' : '1px solid #334155',
                    boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                    color: isLight ? '#1D4ED8' : '#38BDF8',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    letterSpacing: '0.01em'
                  }}>
                    <IconComp size={16} />
                    <span>{sec.title}</span>
                  </div>
                  <div style={{
                    fontSize: '0.84rem',
                    lineHeight: '1.6',
                    color: isLight ? '#334155' : '#E2E8F0'
                  }}>
                    <FormattedText content={sec.content} theme={theme} />
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
          background: isLight ? '#FFFFFF' : '#1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.70rem', color: isLight ? '#64748B' : '#94A3B8', maxWidth: '580px' }}>
            <span style={{ color: '#D97706', fontWeight: 800 }}>Note:</span> {summaryData?.scientific_disclaimer || 'AI Decision-Support Synthesis. Requires mandatory human sign-off before dissemination.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              disabled={!summaryData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9px',
                background: copied 
                  ? (isLight ? '#DCFCE7' : 'rgba(16, 185, 129, 0.25)') 
                  : (isLight ? '#F8FAFC' : '#334155'),
                border: copied 
                  ? (isLight ? '1px solid #86EFAC' : '1px solid #10B981') 
                  : (isLight ? '1px solid #CBD5E1' : '1px solid #475569'),
                color: copied 
                  ? (isLight ? '#15803D' : '#34D399') 
                  : (isLight ? '#1E293B' : '#E2E8F0'),
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
