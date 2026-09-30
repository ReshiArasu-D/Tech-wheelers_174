import React, { useState, useEffect } from 'react';
import { 
  Sparkles, X, Copy, Check, RefreshCw, AlertTriangle, ShieldCheck, 
  Clock, Compass, CloudLightning, Activity, AlertCircle, FileText 
} from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        event_id: stormState?.event_id || 'EVENT-20191107-BOB-01',
        timestamp: currentTimestamp || stormState?.timestamp,
        selected_horizon: selectedHorizon || 'NOW',
        selected_model: selectedModel || 'CONVGRU',
        dashboard_context: stormState
      };
      const res = await api.getAiSummary(payload);
      setSummaryData(res);
    } catch (err) {
      console.error('Error fetching AI summary:', err);
      setError(err.message || 'Failed to generate operational summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, currentTimestamp, selectedHorizon, selectedModel]);

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
    TrendingUpIcon,   // Near-term Outlook
    Compass,          // 6-Hour Outlook
    ShieldCheck,      // Risk / Arrival
    AlertTriangle     // Recommended Operator Attention
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 12, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(10, 15, 26, 0.98)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 0 40px rgba(56, 189, 248, 0.18)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
            }}>
              <Sparkles size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  AI OPERATIONAL NOWCAST SUMMARY
                </h2>
                <span className="badge-proxy" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                  DECISION-SUPPORT ONLY
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Synthesized directly from active sensor telemetry, Farneback flow, and calibrated proxy heads
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              title="Re-generate operational summary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.75rem',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin-anim' : ''} />
              Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Telemetry Context Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 22px',
          background: 'rgba(2, 6, 12, 0.65)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              Timestamp: <span className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>
                {currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : 'CURRENT FRAME'}
              </span>
            </div>
            <div>
              Horizon: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedHorizon}</span>
            </div>
            <div>
              Model: <span style={{ color: '#10b981', fontWeight: 600 }}>{selectedModel}</span>
            </div>
          </div>
          <div>
            Provider: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{summaryData?.provider || 'CO-NOWCAST Engine'}</span>
          </div>
        </div>

        {/* Body Content */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {isLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: '#38bdf8',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px auto'
              }} />
              <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>
                Generating Operational Synthesis...
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Analyzing cell tracking, 4-hazard proxy heads, and arrival corridors
              </div>
            </div>
          ) : error ? (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} color="#ef4444" />
              <div>
                <div style={{ fontWeight: 600 }}>Synthesis Generation Error</div>
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
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.55)',
                    border: '1px solid rgba(56, 189, 248, 0.14)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#38bdf8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em'
                  }}>
                    <IconComp size={16} />
                    <span>{sec.title}</span>
                  </div>
                  <div style={{
                    fontSize: '0.82rem',
                    lineHeight: '1.55',
                    color: '#e2e8f0'
                  }}>
                    <FormattedText content={sec.content} />
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid rgba(56, 189, 248, 0.15)',
          background: 'rgba(10, 15, 26, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', maxWidth: '580px' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Note:</span> {summaryData?.scientific_disclaimer || 'AI Decision-Support Synthesis. Requires mandatory human sign-off before dissemination.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              disabled={!summaryData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                background: copied ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.7)',
                border: copied ? '1px solid #10b981' : '1px solid #334155',
                color: copied ? '#34d399' : '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Report'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
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

function TrendingUpIcon(props) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  );
}
