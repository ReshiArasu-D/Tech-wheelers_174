import React, { useState } from 'react';
import { Layers, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function VerticalCrossSectionPanel({ radarData, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // The original TERLS NetCDF has 81 vertical levels and 481x481 spatial grid.
  // Current pipeline uses 2D [5,3,128,128] input for ConvGRU inference.
  // 3D volumetric rendering requires a dedicated backend slice endpoint (not yet wired).
  // The source 3D data EXISTS on disk; the 2D inference view is the active runtime view.
  const has3DSource = true;       // TERLS NetCDF with 81 vertical levels is available
  const has3DInference = false;   // No 3D inference endpoint wired yet

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      right: '440px',
      width: '340px',
      background: 'rgba(10, 15, 26, 0.96)',
      border: '1px solid rgba(56, 189, 248, 0.28)',
      boxShadow: '0 4px 25px rgba(0,0,0,0.7)',
      backdropFilter: 'blur(12px)',
      borderRadius: '10px',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 13px',
        background: 'rgba(15, 23, 42, 0.85)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={15} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>
            Vertical Cross-Section
          </span>
          <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 3,
            background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontWeight: 700 }}>
            2D INFERENCE VIEW
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setIsExpanded(e => !e)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, display: 'flex' }}
            title="Expand"
          >
            {isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, display: 'flex' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* Status banner */}
        <div style={{
          padding: '8px 10px', borderRadius: 7, marginBottom: 12,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
            3D VOLUMETRIC SOURCE: AVAILABLE
          </div>
          <div style={{ fontSize: '0.65rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            ISRO TERLS C-band DWR NetCDF contains <strong style={{ color: '#f8fafc' }}>81 vertical levels</strong> and
            a <strong style={{ color: '#f8fafc' }}>481 × 481 spatial grid</strong> (DBZ + VEL).
          </div>
        </div>

        {/* Active view description */}
        <div style={{
          padding: '8px 10px', borderRadius: 7, marginBottom: isExpanded ? 12 : 0,
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.2)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
            ACTIVE INFERENCE: 2D BASE REFLECTIVITY
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Current ConvGRU pipeline uses <strong style={{ color: '#cbd5e1' }}>2D processed input
            [5, 3, 128, 128]</strong> — DBZ + Velocity + Validity mask — from the lowest available
            scan elevation. Full 3D cross-section rendering requires a dedicated backend slice endpoint.
          </div>
        </div>

        {/* Expanded: per-channel mini legend */}
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { ch: 'CH0 · DBZ', desc: 'Reflectivity  [0 → 70 dBZ]', color: '#38bdf8' },
              { ch: 'CH1 · VEL', desc: 'Radial velocity  [−30 → +30 m/s]', color: '#a78bfa' },
              { ch: 'CH2 · MASK', desc: 'Radar validity mask  [0 / 1]', color: '#34d399' },
            ].map(r => (
              <div key={r.ch} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 5,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: r.color }}>{r.ch}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
