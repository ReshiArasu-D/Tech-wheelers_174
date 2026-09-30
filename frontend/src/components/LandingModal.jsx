import React from 'react';
import { Play, Shield, CloudLightning, Satellite, Radio, Zap, ArrowRight, X } from 'lucide-react';

export default function LandingModal({ isOpen, onClose, onStartReplay }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 14, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(10, 15, 26, 0.98)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 0 50px rgba(56, 189, 248, 0.22)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={16} />
        </button>

        {/* Hero Banner */}
        <div style={{
          padding: '36px 36px 24px 36px',
          background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.18) 0%, rgba(10, 15, 26, 0) 100%)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.45)'
          }}>
            <CloudLightning size={30} color="#ffffff" />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge-production" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '4px' }}>
              SIH 2026 • PROBLEM STATEMENT 26084
            </span>
          </div>

          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            marginBottom: '6px'
          }}>
            CO-NOWCAST
          </h1>

          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '10px' }}>
            Convective-Scale Storm Intelligence & Nowcasting (0–6 hr)
          </div>

          <p style={{
            fontSize: '0.84rem',
            color: '#94a3b8',
            maxWidth: '540px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            Physics-anchored AI decision support system combining dense Farneback optical flow, ConvGRU residual learning, 4 multi-hazard proxies, and mandatory human operator approval.
          </p>
        </div>

        {/* Call-to-Action Bar */}
        <div style={{
          padding: '0 36px 24px 36px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => {
              onClose();
              if (onStartReplay) onStartReplay();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Play size={18} fill="#ffffff" />
            PLAY STORM REPLAY
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.65)',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Open Command Dashboard
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Prototype vs Production Sensor Matrix */}
        <div style={{
          padding: '18px 36px 24px 36px',
          background: 'rgba(2, 6, 12, 0.65)',
          borderTop: '1px solid rgba(56, 189, 248, 0.15)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', textAlign: 'center' }}>
            Sensor Modality Architecture
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span className="badge-real" style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                  ACTIVE PROTOTYPE
                </span>
                <span style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 600 }}>Historical Storm Replay</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.4' }}>
                • INSAT-3D TIR1 Level-1B (3.7 km native)<br />
                • ERA5 Thermodynamic Profiles (CAPE, PW, Shear)<br />
                • Farneback Advection + ConvGRU Residuals
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span className="badge-production" style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                  PRODUCTION DESIGN
                </span>
                <span style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 600 }}>Radar-Anchored 1 km Grid</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.4' }}>
                • DWR Doppler Radar Reflectivity & Radial Velocity<br />
                • Ground Lightning Detection Network (LLDN)<br />
                • Automated CAP/XML Multi-Channel Dissemination
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
