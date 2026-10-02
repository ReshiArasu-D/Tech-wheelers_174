import React, { useEffect, useRef } from 'react';
import { Play, CloudLightning, ArrowRight, X, Sparkles } from 'lucide-react';
import gsap from 'gsap';

export default function LandingModal({ isOpen, onClose, onStartReplay }) {
  const backdropRef = useRef(null);
  const modalRef = useRef(null);
  const iconRef = useRef(null);
  const primaryBtnRef = useRef(null);
  const secondaryBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const ctx = gsap.context(() => {
        // Backdrop fade in
        gsap.fromTo(backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: 'power2.out' }
        );

        // Modal card pop & spring entrance
        gsap.fromTo(modalRef.current,
          { opacity: 0, scale: 0.88, y: 30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)' }
        );

        // Staggered reveal for internal elements
        gsap.fromTo('.gsap-landing-item',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.1 }
        );

        // Subtle continuous float on icon
        gsap.to(iconRef.current, {
          y: -4,
          duration: 1.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }, modalRef);

      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBtnHover = (ref, isHover) => {
    if (ref.current) {
      gsap.to(ref.current, {
        scale: isHover ? 1.025 : 1,
        y: isHover ? -2 : 0,
        duration: 0.2,
        ease: 'power2.out'
      });
    }
  };

  const handleBtnClick = (ref, callback) => {
    if (ref.current) {
      gsap.timeline()
        .to(ref.current, { scale: 0.95, duration: 0.08, ease: 'power2.in' })
        .to(ref.current, { 
          scale: 1, 
          duration: 0.15, 
          ease: 'power2.out', 
          onComplete: callback 
        });
    } else if (callback) {
      callback();
    }
  };

  return (
    <div 
      ref={backdropRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.48)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.22), 0 10px 24px -4px rgba(15, 23, 42, 0.08)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '720px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.background = '#E2E8F0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.background = '#F8FAFC';
          }}
        >
          <X size={16} />
        </button>

        {/* Hero Banner */}
        <div style={{
          padding: '38px 36px 24px 36px',
          background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)',
          textAlign: 'center'
        }}>
          {/* Animated Hero Icon */}
          <div 
            ref={iconRef}
            className="gsap-landing-item"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            }}
          >
            <CloudLightning size={30} color="#FFFFFF" />
          </div>

          {/* Hackathon Badge */}
          <div className="gsap-landing-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Sparkles size={11} color="#2563EB" />
              SIH 2026 • PROBLEM STATEMENT 26084
            </span>
          </div>

          {/* Title */}
          <h1 
            className="gsap-landing-item"
            style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: '1.2',
              marginBottom: '6px'
            }}
          >
            CO-NOWCAST
          </h1>

          {/* Subtitle */}
          <div 
            className="gsap-landing-item"
            style={{ 
              fontSize: '1.02rem', 
              fontWeight: 700, 
              color: '#2563EB', 
              marginBottom: '12px',
              letterSpacing: '-0.01em'
            }}
          >
            Convective-Scale Storm Intelligence & Nowcasting (0–6 hr)
          </div>

          {/* Body Description */}
          <p 
            className="gsap-landing-item"
            style={{
              fontSize: '0.86rem',
              color: '#475569',
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}
          >
            Physics-anchored AI decision support system combining dense Farneback optical flow, ConvGRU spatio-temporal residual learning, 6 discrete convective hazard heads, and human-in-the-loop operational verification.
          </p>
        </div>

        {/* Call-to-Action Buttons */}
        <div 
          className="gsap-landing-item"
          style={{
            padding: '0 36px 26px 36px',
            display: 'flex',
            gap: '14px',
            justifyContent: 'center'
          }}
        >
          {/* Primary Action Button */}
          <button
            ref={primaryBtnRef}
            onClick={() => handleBtnClick(primaryBtnRef, () => {
              onClose();
              if (onStartReplay) onStartReplay();
            })}
            onMouseEnter={() => handleBtnHover(primaryBtnRef, true)}
            onMouseLeave={() => handleBtnHover(primaryBtnRef, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '12px 26px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              letterSpacing: '0.01em'
            }}
          >
            <Play size={16} fill="#FFFFFF" />
            <span>Play Storm Replay</span>
          </button>

          {/* Secondary Action Button */}
          <button
            ref={secondaryBtnRef}
            onClick={() => handleBtnClick(secondaryBtnRef, onClose)}
            onMouseEnter={() => handleBtnHover(secondaryBtnRef, true)}
            onMouseLeave={() => handleBtnHover(secondaryBtnRef, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              letterSpacing: '0.01em'
            }}
          >
            <span>Open Command Dashboard</span>
            <ArrowRight size={16} color="#2563EB" />
          </button>
        </div>

        {/* Prototype vs Production Sensor Matrix */}
        <div style={{
          padding: '16px 36px 22px 36px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0'
        }}>
          <div 
            className="gsap-landing-item"
            style={{ 
              fontSize: '0.68rem', 
              fontWeight: 800, 
              color: '#64748B', 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              marginBottom: '10px', 
              textAlign: 'center' 
            }}
          >
            Sensor Modality Architecture
          </div>

          <div 
            className="gsap-landing-item"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
          >
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid #BBF7D0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ 
                  fontSize: '0.62rem', 
                  fontWeight: 800, 
                  padding: '2px 7px', 
                  borderRadius: '4px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  letterSpacing: '0.03em'
                }}>
                  ACTIVE PROTOTYPE
                </span>
                <span style={{ fontSize: '0.80rem', color: '#0F172A', fontWeight: 700 }}>
                  Historical Storm Replay
                </span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: '1.45' }}>
                • INSAT-3D TIR1 Level-1B (3.7 km native)<br />
                • ERA5 Thermodynamic Profiles (CAPE, PW, Shear)<br />
                • Farneback Advection + ConvGRU Residuals
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid #BFDBFE',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ 
                  fontSize: '0.62rem', 
                  fontWeight: 800, 
                  padding: '2px 7px', 
                  borderRadius: '4px',
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #93C5FD',
                  letterSpacing: '0.03em'
                }}>
                  PRODUCTION DESIGN
                </span>
                <span style={{ fontSize: '0.80rem', color: '#0F172A', fontWeight: 700 }}>
                  Radar-Anchored 1 km Grid
                </span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: '1.45' }}>
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
