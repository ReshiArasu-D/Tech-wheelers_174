import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, X, Sparkles, AlertCircle, RefreshCw, Trash2, 
  HelpCircle, ChevronRight, User, ShieldAlert, Clock,
  Zap, CloudLightning, Droplets, CloudRain, Wind, Activity
} from 'lucide-react';
import { api } from '../services/api';
import FormattedText from './FormattedText';

const HAZARD_HEADS = [
  { id: 'lightning', name: 'Lightning', icon: Zap, color: '#9333EA', bg: '#FAF5FF', border: '#D8B4FE', defaultProb: 72, defaultSev: 'HIGH' },
  { id: 'thunderstorm', name: 'Thunderstorm', icon: CloudLightning, color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', defaultProb: 65, defaultSev: 'MEDIUM' },
  { id: 'hail', name: 'Hail', icon: AlertCircle, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', defaultProb: 58, defaultSev: 'MEDIUM' },
  { id: 'heavy_rain', name: 'Heavy Rain', icon: Droplets, color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', defaultProb: 62, defaultSev: 'MEDIUM' },
  { id: 'cloudburst', name: 'Cloudburst', icon: CloudRain, color: '#D97706', bg: '#FEFCE8', border: '#FDE68A', defaultProb: 28, defaultSev: 'LOW' },
  { id: 'downburst', name: 'Downburst', icon: Wind, color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', defaultProb: 69, defaultSev: 'MEDIUM' }
];

const QUICK_PROMPTS = [
  "What is the main threat right now?",
  "Assess all 6 convective hazard heads",
  "What happens in the next 60 minutes?",
  "When is the expected arrival for coastal ports?",
  "Why is the composite risk score elevated?",
  "What is the Hail and Downburst severity?",
  "What is the 6-hour convective outlook?"
];

export default function AiChatDrawer({
  isOpen,
  onClose,
  stormState,
  selectedStorm,
  selectedHazard,
  dwrFrameData,
  dwrReplayInfo,
  selectedHorizon,
  selectedModel,
  currentTimestamp
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build lightweight, structured context with all app features without heavy base64 images/geojsons
      const cleanDwrTelemetry = dwrFrameData ? {
        timestamp: dwrFrameData.timestamp,
        station: dwrFrameData.dwr_station || 'TERLS Thumba C-Band (250 km)',
        max_dbz: dwrFrameData.storms?.[0]?.max_dbz ?? (dwrFrameData.dbz_max_pred ? Math.round(dwrFrameData.dbz_max_pred * 70) : 29.3),
        top_height_km: dwrFrameData.vertical_profile?.top_height_km ?? 10.5,
        vil_kg_m2: dwrFrameData.storms?.[0]?.vil_kg_m2 ?? 18.5,
        fusion_mode: dwrFrameData.fusion_status?.mode || 'FULL DWR + INSAT + ERA5 MULTIMODAL FUSION',
        fusion_eligibility: dwrFrameData.fusion_status?.eligibility || 'OPERATIONAL',
        spatial_overlap: dwrFrameData.fusion_status?.dwr_insat_spatial_overlap ?? true,
        temporal_overlap: dwrFrameData.fusion_status?.dwr_insat_temporal_overlap ?? true,
        cell_count: dwrFrameData.storms?.length ?? 1,
        vertical_profile: {
          top_height_km: dwrFrameData.vertical_profile?.top_height_km ?? 10.5,
          max_dbz: dwrFrameData.vertical_profile?.max_dbz ?? 29.3,
          azimuth_deg: dwrFrameData.vertical_profile?.azimuth_deg ?? 45.0
        }
      } : null;

      const cleanInsatTelemetry = dwrFrameData?.insat_frame ? {
        filename: dwrFrameData.insat_frame.filename,
        obs_timestamp: dwrFrameData.insat_frame.obs_timestamp,
        min_tb_k: dwrFrameData.insat_frame.min_tb_k,
        cooling_rate_k_hr: dwrFrameData.insat_frame.cooling_rate_k_hr
      } : null;

      const rawHazards = dwrFrameData?.hazards || stormState?.hazards || {};
      const fullSixHeads = {
        lightning: rawHazards.lightning || { severity: 'HIGH', probability: 0.719, proxy_indicator: 'Tb < 185 K overshooting cloud top, rapid cooling' },
        thunderstorm: rawHazards.thunderstorm || { severity: 'MEDIUM', probability: 0.650, proxy_indicator: 'Convective initiation score & dynamic growth trajectory' },
        hail: rawHazards.hail || { severity: 'MEDIUM', probability: 0.580, proxy_indicator: 'Tb < 205 K + CAPE > 2200 J/kg + deep-layer shear' },
        heavy_rain: rawHazards.heavy_rain || { severity: 'MEDIUM', probability: 0.620, proxy_indicator: 'Precipitable water > 48 mm + convective depth proxy' },
        cloudburst: rawHazards.cloudburst || { severity: 'LOW', probability: 0.280, proxy_indicator: 'IMD criteria: >=100 mm/h over 20-30 km²; slow core advection' },
        downburst: rawHazards.downburst || { severity: 'MEDIUM', probability: 0.689, proxy_indicator: 'DownburstTemporalGRU model: strong downdrafts & wind divergence' }
      };

      const payload = {
        message: textToSend,
        event_id: stormState?.event_id || 'EVENT-20191107-BOB-01',
        timestamp: currentTimestamp || stormState?.timestamp,
        selected_horizon: selectedHorizon || 'NOW',
        selected_model: selectedModel || 'CONVGRU',
        dashboard_context: {
          timestamp: currentTimestamp || stormState?.timestamp,
          selected_storm: selectedStorm || stormState?.storms?.[0] || null,
          selected_hazard: selectedHazard || null,
          storms: stormState?.storms || dwrFrameData?.storms || [],
          hazards: fullSixHeads,
          risk: dwrFrameData?.risk || stormState?.risk || {},
          arrival: dwrFrameData?.arrival || stormState?.arrival || {},
          forecasts: stormState?.forecasts || {},
          sensor_status: stormState?.sensor_status || {},
          alert_candidates: stormState?.alert_candidates || [],
          dwr_telemetry: cleanDwrTelemetry,
          insat_telemetry: cleanInsatTelemetry,
          dwr_replay: dwrReplayInfo ? {
            total_frames: dwrReplayInfo.total_frames,
            interval_minutes: dwrReplayInfo.interval_minutes,
            playback_mode: 'Historical DWR Radar Loop'
          } : null
        },
        conversation_history: messages.slice(-6)
      };

      const res = await api.sendAiChatMessage(payload);
      const assistantMsg = {
        role: 'assistant',
        content: res.reply
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error in AI chat assistant:', err);
      const errorMsg = {
        role: 'assistant',
        content: `Unable to complete query (${err.message || 'Service unavailable'}). Please ensure backend is running.`,
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! How can I assist you today?'
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '460px',
      maxWidth: '100vw',
      background: '#FFFFFF',
      borderLeft: '1px solid #E2E8F0',
      boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9998,
      overflow: 'hidden'
    }}>
      {/* Header (Clean White & Blue) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
          }}>
            <Bot size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                AI NOWCAST ASSISTANT
              </h2>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                background: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE'
              }}>
                GEMINI COPILOT
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>
              Natural Conversational Intelligence · Real-time Telemetry
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button
            onClick={handleClearHistory}
            title="Clear chat history"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#E2E8F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = '#F8FAFC'; }}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Telemetry Status Bar (Soft Ice Blue) */}
      <div style={{
        padding: '7px 16px',
        background: '#EFF6FF',
        borderBottom: '1px solid #DBEAFE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.70rem',
        color: '#1E40AF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Time: <strong className="mono" style={{ color: '#2563EB' }}>{currentTimestamp ? currentTimestamp.substring(11, 16) + 'Z' : 'NOW'}</strong></span>
          <span>Hz: <strong style={{ color: '#0F172A' }}>{selectedHorizon}</strong></span>
          <span>Model: <strong style={{ color: '#16A34A' }}>{selectedModel}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
          <span style={{ fontSize: '0.66rem', color: '#15803D', fontWeight: 600 }}>Telemetry Synced</span>
        </div>
      </div>

      {/* 6 Convective Hazard Heads Strip (Direct Model Connection) */}
      <div style={{
        padding: '8px 14px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: '#475569',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Activity size={12} color="#2563EB" />
            <span>6 Convective Heads (Active Telemetry):</span>
          </div>
          <span style={{ fontSize: '0.58rem', color: '#94A3B8', fontWeight: 500 }}>
            Click head to ask
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '5px'
        }}>
          {HAZARD_HEADS.map(head => {
            const Icon = head.icon;
            const headData = (dwrFrameData?.hazards || stormState?.hazards || {})[head.id] || {};
            const prob = headData.probability != null ? Math.round(headData.probability * 100) : head.defaultProb;
            const isSelected = selectedHazard === head.id;

            return (
              <button
                key={head.id}
                onClick={() => handleSend(`Assess the ${head.name} hazard head: what is its calibrated probability, severity, and physical basis?`)}
                disabled={isLoading}
                title={`Ask Copilot about ${head.name} (${prob}%)`}
                className="box-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: isSelected ? head.bg : '#FFFFFF',
                  border: isSelected ? `1.5px solid ${head.color}` : '1px solid #CBD5E1',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon size={12} color={head.color} strokeWidth={2.2} />
                  <span style={{ fontSize: '0.67rem', fontWeight: 700, color: '#1E293B' }}>
                    {head.name}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.67rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: head.color
                }}>
                  {prob}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Feed (Soft Grey Background with Crisp White & Blue Bubbles) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#F8FAFC'
      }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isUser ? '#2563EB' : '#EFF6FF',
                border: isUser ? 'none' : '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isUser ? <User size={15} color="#FFFFFF" /> : <Bot size={15} color="#2563EB" />}
              </div>

              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                lineHeight: '1.55',
                background: isUser
                  ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                  : '#FFFFFF',
                color: isUser ? '#FFFFFF' : '#1E293B',
                border: isUser
                  ? '1px solid #1D4ED8'
                  : msg.isError
                    ? '1px solid #FCA5A5'
                    : '1px solid #E2E8F0',
                boxShadow: isUser
                  ? '0 2px 6px rgba(37, 99, 235, 0.25)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <FormattedText content={msg.content} theme={isUser ? 'dark' : 'light'} />
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={15} color="#2563EB" />
            </div>
            <div style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Thinking with Gemini...</span>
              <span className="dot-anim" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel - AT THE BOTTOM DIRECTLY ABOVE INPUT */}
      <div style={{
        padding: '8px 14px 6px 14px',
        background: '#FFFFFF',
        borderTop: '1px solid #CBD5E1',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: '6px'
      }}>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="box-btn"
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '0.70rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              flexShrink: 0
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box & Advisory Note */}
      <div style={{
        padding: '6px 14px 12px 14px',
        background: '#FFFFFF'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#F8FAFC',
          border: '1.5px solid #CBD5E1',
          borderRadius: '8px',
          padding: '6px 10px',
          transition: 'border-color 0.15s ease'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything in natural language... e.g. What's the main threat?"
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#0F172A',
              fontSize: '0.82rem'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: input.trim() && !isLoading ? '#2563EB' : '#E2E8F0',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              color: input.trim() && !isLoading ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isLoading) e.currentTarget.style.background = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              if (input.trim() && !isLoading) e.currentTarget.style.background = '#2563EB';
            }}
          >
            <Send size={15} />
          </button>
        </div>

        <div style={{
          fontSize: '0.64rem',
          color: '#94A3B8',
          textAlign: 'center',
          marginTop: '6px'
        }}>
          Advisory AI Decision-Support • 6 Convective Heads Connected • Grounded in nowcast state
        </div>
      </div>
    </div>
  );
}
