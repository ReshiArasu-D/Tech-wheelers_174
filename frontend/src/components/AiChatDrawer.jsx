import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, X, Sparkles, AlertCircle, RefreshCw, Trash2, 
  HelpCircle, ChevronRight, User, ShieldAlert, Clock
} from 'lucide-react';
import { api } from '../services/api';
import FormattedText from './FormattedText';

const QUICK_PROMPTS = [
  "What is the main threat right now?",
  "What happens in the next 60 minutes?",
  "When is the expected arrival for coastal ports?",
  "Why is the composite risk score elevated?",
  "Which hazard is dominant across the tracked cells?",
  "What changes by +3 hours?",
  "What is the 6-hour convective outlook?"
];

export default function AiChatDrawer({
  isOpen,
  onClose,
  stormState,
  selectedHorizon,
  selectedModel,
  currentTimestamp
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with greeting on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting = {
        role: 'assistant',
        content: `**CO-NOWCAST Operational Assistant Online.**\n\nI am connected to the current synoptic state at **${currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : 'Active Frame'}** (Horizon: **${selectedHorizon}**, Model: **${selectedModel}**).\n\nYou can ask about dominant hazards, leading-edge arrival countdowns, 60-minute motion advection, or why the composite risk score is elevated.`
      };
      setMessages([initialGreeting]);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, currentTimestamp, selectedHorizon, selectedModel]);

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
      const payload = {
        message: textToSend,
        event_id: stormState?.event_id || 'EVENT-20191107-BOB-01',
        timestamp: currentTimestamp || stormState?.timestamp,
        selected_horizon: selectedHorizon || 'NOW',
        selected_model: selectedModel || 'CONVGRU',
        dashboard_context: stormState,
        conversation_history: messages.slice(-6)
      };

      const res = await api.sendAiChatMessage(payload);
      const assistantMsg = {
        role: 'assistant',
        content: res.reply,
        provider: res.provider
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error in AI chat assistant:', err);
      const errorMsg = {
        role: 'assistant',
        content: `**Operational Assistant Notice**: Unable to complete query (${err.message || 'Service unavailable'}). Please ensure backend is running.`,
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
    setMessages([]);
    setTimeout(() => {
      setMessages([{
        role: 'assistant',
        content: `**Conversation cleared.** Ready for new queries regarding current nowcast frame **${currentTimestamp ? currentTimestamp.replace('T', ' ').replace('Z', ' UTC') : 'Active Frame'}**.`
      }]);
    }, 100);
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
      background: 'rgba(10, 15, 26, 0.98)',
      borderLeft: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9998,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        background: 'rgba(15, 23, 42, 0.9)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
          }}>
            <Bot size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                AI NOWCAST ASSISTANT
              </h2>
              <span className="badge-proxy" style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                DECISION-SUPPORT
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Grounded strictly in active nowcast telemetry
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleClearHistory}
            title="Clear chat history"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
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

      {/* Telemetry Status Bar */}
      <div style={{
        padding: '6px 16px',
        background: 'rgba(2, 6, 12, 0.75)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Time: <strong className="mono" style={{ color: '#38bdf8' }}>{currentTimestamp ? currentTimestamp.substring(11, 16) + 'Z' : 'NOW'}</strong></span>
          <span>Hz: <strong style={{ color: '#f8fafc' }}>{selectedHorizon}</strong></span>
          <span>Model: <strong style={{ color: '#10b981' }}>{selectedModel}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Telemetry Synced</span>
        </div>
      </div>

      {/* Quick Prompts Carousel / Pills */}
      <div style={{
        padding: '8px 14px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.08)',
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
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              color: '#cbd5e1',
              fontSize: '0.68rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)'}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
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
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: isUser ? '#0284c7' : 'rgba(30, 41, 59, 0.9)',
                border: isUser ? 'none' : '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isUser ? <User size={14} color="#ffffff" /> : <Bot size={14} color="#38bdf8" />}
              </div>

              <div style={{
                maxWidth: '84%',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                lineHeight: '1.5',
                background: isUser
                  ? 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)'
                  : 'rgba(15, 23, 42, 0.85)',
                color: isUser ? '#ffffff' : '#e2e8f0',
                border: isUser
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : msg.isError
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(56, 189, 248, 0.2)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <FormattedText content={msg.content} />
                {!isUser && msg.provider && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.65rem',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Sparkles size={11} />
                    <span>{msg.provider}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={14} color="#38bdf8" />
            </div>
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Synthesizing from nowcast telemetry</span>
              <span className="dot-anim" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Disclaimer */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(10, 15, 26, 0.95)',
        borderTop: '1px solid rgba(56, 189, 248, 0.18)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          padding: '6px 10px'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about dominant hazards, arrivals, 60m motion..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
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
              background: input.trim() && !isLoading ? '#0284c7' : 'rgba(51, 65, 85, 0.5)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              color: '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={15} />
          </button>
        </div>

        <div style={{
          fontSize: '0.64rem',
          color: '#64748b',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          Advisory AI Decision-Support • Grounded in active nowcast state • Human approval required
        </div>
      </div>
    </div>
  );
}
