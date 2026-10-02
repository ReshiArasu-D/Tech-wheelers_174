import React, { useState, useEffect } from 'react';
import { Maximize2, X, ChevronDown, ChevronUp, Activity } from 'lucide-react';


// ── helpers ──────────────────────────────────────────────────────────────────
function dbzColor(norm) {
  const dbz = norm * 60;
  if (dbz >= 55) return '#990000';
  if (dbz >= 45) return '#cc6600';
  if (dbz >= 35) return '#ccaa00';
  if (dbz >= 25) return '#009900';
  if (dbz >= 15) return '#005ce6';
  return '#001a66';
}

function fmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const HH = String(d.getUTCHours()).padStart(2,'0');
    const MM = String(d.getUTCMinutes()).padStart(2,'0');
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${HH}:${MM}`;
  } catch { return ts.substring(0,16).replace('T',' '); }
}

function PanelCard({ title, badge, badgeColor, rightLabel, footer, onExpand, children }) {
  return (
    <div
      onClick={onExpand}
      title={onExpand ? "Click to expand visualization" : undefined}
      className="box-card"
      style={{
        background:'#FFFFFF', border:'1px solid #CBD5E1', borderRadius:'8px',
        padding:'9px 11px', display:'flex', flexDirection:'column',
        justifyContent:'space-between', position:'relative',
        overflow:'hidden', boxShadow:'0 1px 3px rgba(15, 23, 42, 0.05)',
        cursor: onExpand ? 'pointer' : 'default',
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#93C5FD';
        e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(37, 99, 235, 0.14)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.05)';
      }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:'11px', fontWeight:800, color:'#0F172A' }}>{title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          {badge && (
            <span style={{
              fontSize:'8px',
              fontWeight:800,
              padding:'1px 5px',
              borderRadius:'3px',
              background: badgeColor?.bg || '#DBEAFE',
              color: badgeColor?.text || '#1E40AF',
              border: `1px solid ${badgeColor?.border || '#93C5FD'}`
            }}>
              {badge}
            </span>
          )}
          {rightLabel && <span style={{ fontSize:'9px', color:'#64748B', fontFamily:'monospace' }}>{rightLabel}</span>}
          {onExpand && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: '#F1F5F9',
                color: '#64748B',
                marginLeft: '2px'
              }}
              title="Expand view"
            >
              <Maximize2 size={10} />
            </span>
          )}
        </div>
      </div>
      <div style={{ flex:1, minHeight:0, position:'relative', margin:'4px 0' }}>{children}</div>
      {footer && <div style={{ fontSize:'8.5px', color:'#64748B', display:'flex', justifyContent:'space-between', flexShrink:0 }}>{footer}</div>}
    </div>
  );
}

function DarkCanvas({ children }) {
  return (
    <div style={{ width:'100%', height:'100%', borderRadius:'5px', background:'#0D1624', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </div>
  );
}

function VColorBar({ gradient, labels }) {
  return (
    <>
      <div style={{ position:'absolute', right:'8px', top:'6px', bottom:'6px', width:'6px', background:gradient, borderRadius:'2px', border:'1px solid rgba(255,255,255,0.4)' }} />
      <div style={{ position:'absolute', right:'16px', top:'6px', bottom:'6px', display:'flex', flexDirection:'column', justifyContent:'space-between', fontSize:'7.5px', color:'rgba(255,255,255,0.7)', fontFamily:'monospace', pointerEvents:'none' }}>
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </>
  );
}

// ── Panel 1: INSAT-3D IR (Real MOSDAC Observation Raster) ────────────────────
function InsatPanel({ dwrFrameData, stormState }) {
  const insat = dwrFrameData?.insat_frame || stormState?.sensor_data?.satellite;
  const storm = stormState?.storms?.[0] || dwrFrameData?.storms?.[0];
  const minTb = insat?.min_tb_k ?? storm?.min_tb_k ?? null;
  const coolingRate = storm?.cooling_rate_k_hr ?? null;
  const obsTs = insat?.obs_timestamp ? fmtTs(insat.obs_timestamp) : null;
  const imageUri = insat?.image_data_uri;
  const timeDiffMin = insat?.time_difference_minutes;
  const isTemporalValid = insat?.temporal_overlap !== false;

  useEffect(() => {
    if (insat) {
      console.log(
        `[SCIENTIFIC-PANELS INSAT] DWR: ${dwrFrameData?.timestamp || 'N/A'} ` +
        `-> File: ${insat?.filename || 'N/A'} ` +
        `-> Obs: ${insat?.obs_timestamp || 'N/A'} ` +
        `-> Δt: ${timeDiffMin != null ? timeDiffMin : 'N/A'}m ` +
        `-> Raster Present: ${Boolean(imageUri)}`
      );
    }
  }, [dwrFrameData?.timestamp, insat?.obs_timestamp, insat?.filename, imageUri, timeDiffMin]);

  return (
    <DarkCanvas>
      {imageUri ? (
        <img
          key={insat?.obs_timestamp || insat?.filename || 'insat-raster-img'}
          src={imageUri}
          alt="Real INSAT-3D/3DR TIR-1 Observation"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
      ) : (
        <div style={{ color: '#64748B', fontSize: '9px', fontFamily: 'monospace' }}>
          INGESTING REAL INSAT-3DR H5...
        </div>
      )}
      {/* Real Ingested Telemetry Overlay */}
      <div style={{ position: 'absolute', top: '6px', left: '8px', zIndex: 2, pointerEvents: 'none' }}>
        {minTb != null && (
          <div style={{ color: '#F1F5F9', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, textShadow: '0 1px 2px #000' }}>
            Tb={minTb.toFixed(1)} K
          </div>
        )}
        {coolingRate != null && (
          <div style={{ color: '#FCD34D', fontSize: '7.5px', fontFamily: 'monospace', textShadow: '0 1px 2px #000' }}>
            ΔT={coolingRate > 0 ? '-' : '+'}{Math.abs(coolingRate).toFixed(1)} K/hr
          </div>
        )}
        {obsTs && (
          <div style={{ color: '#93C5FD', fontSize: '7px', fontFamily: 'monospace', marginTop: '2px', textShadow: '0 1px 2px #000' }}>
            Obs: {obsTs} {timeDiffMin != null ? `(Δt: +${timeDiffMin}m)` : ''}
          </div>
        )}
        {!isTemporalValid && (
          <div style={{ color: '#F59E0B', fontSize: '6.5px', fontFamily: 'monospace', fontWeight: 800, marginTop: '2px', textShadow: '0 1px 2px #000' }}>
            [Δt &gt; 30m MISMATCH]
          </div>
        )}
      </div>



      <VColorBar
        gradient="linear-gradient(to bottom,#FFFFFF 0%,#DC2626 20%,#EA580C 40%,#EAB308 60%,#0284C7 80%,#0D1624 100%)"
        labels={['-20', '-40', '-60', '-80']}
      />
    </DarkCanvas>
  );
}

// ── Panel 2: DWR Reflectivity (Real TERLS Radar Replay) ───────────────────────
function DwrPanel({ dwrFrameData, stormState, isExpanded = false }) {
  const storms = dwrFrameData?.storms || stormState?.storms || [];
  const maxDbz = storms.length > 0 ? Math.max(...storms.map(s => s.max_dbz ?? 0)) : (dwrFrameData?.dbz_max_pred ? Math.round(dwrFrameData.dbz_max_pred * 70) : null);
  const imageUri = dwrFrameData?.dwr_image_data_uri;

  // Helper to colorize radar cell dots by intensity tier
  const getCellColor = (dbz) => {
    if (dbz >= 45) return '#dc2626'; // Severe (Red)
    if (dbz >= 35) return '#f59e0b'; // Heavy (Yellow/Amber)
    if (dbz >= 25) return '#16a34a'; // Moderate (Green)
    return '#0284c7';               // Light (Blue)
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Radar Canvas Display */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <DarkCanvas>
          {imageUri ? (
            <img
              src={imageUri}
              alt="TERLS C-Band Radar Reflectivity"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
          ) : (
            <div style={{ color: '#64748B', fontSize: '9px', fontFamily: 'monospace' }}>
              LOADING TERLS RADAR SCAN...
            </div>
          )}

          {/* Range rings, center radar station, and detected storm dots */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 180 80"
            preserveAspectRatio="xMidYMid meet"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {/* Concentric distance rings: 80 km, 165 km, 250 km */}
            {[0.33, 0.66, 1.0].map((r, i) => (
              <circle
                key={i}
                cx="90"
                cy="40"
                r={r * 36}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={isExpanded ? "0.4" : "0.6"}
                strokeDasharray="2 2"
              />
            ))}
            {/* Range distance labels */}
            <text x="91" y="28.5" fill="rgba(255,255,255,0.4)" fontSize={isExpanded ? "2.5" : "3"} fontFamily="monospace">80km</text>
            <text x="91" y="16.5" fill="rgba(255,255,255,0.4)" fontSize={isExpanded ? "2.5" : "3"} fontFamily="monospace">165km</text>
            <text x="91" y="4.5" fill="rgba(255,255,255,0.4)" fontSize={isExpanded ? "2.5" : "3"} fontFamily="monospace">250km</text>

            {/* Radar crosshairs */}
            <line x1="90" y1="4" x2="90" y2="76" stroke="rgba(255,255,255,0.18)" strokeWidth={isExpanded ? "0.4" : "0.6"} />
            <line x1="54" y1="40" x2="126" y2="40" stroke="rgba(255,255,255,0.18)" strokeWidth={isExpanded ? "0.4" : "0.6"} />

            {/* Center Radar Station: TERLS C-Band (Thiruvananthapuram, ISRO origin) */}
            <circle cx="90" cy="40" r={isExpanded ? "2.5" : "2"} fill="none" stroke="#38bdf8" strokeWidth={isExpanded ? "0.5" : "0.7"} strokeDasharray="1 1" />
            <circle cx="90" cy="40" r={isExpanded ? "1.2" : "1.0"} fill="#38bdf8" stroke="#ffffff" strokeWidth="0.5" />

            {/* Detected radar cell centroid dots (Color matches cell's peak dBZ severity tier) */}
            {storms.map((s, idx) => {
              if (!s.centroid) return null;
              const dLat = (s.centroid.lat - 8.5241) / 2.25;
              const dLon = (s.centroid.lon - 76.9366) / 2.25;
              const cx = 90 + dLon * 36;
              const cy = 40 - dLat * 36;
              const dbz = s.max_dbz ?? 30;
              const dotColor = getCellColor(dbz);
              const rCore = isExpanded ? 1.5 : 2.0;

              return (
                <g key={s.storm_id || idx}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rCore + 1.2}
                    fill="none"
                    stroke={dotColor}
                    strokeWidth={isExpanded ? "0.5" : "0.7"}
                    opacity="0.85"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rCore}
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth={isExpanded ? "0.4" : "0.6"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Telemetry labels */}
          <div style={{ position: 'absolute', top: '6px', left: '8px', zIndex: 2, pointerEvents: 'none' }}>
            {maxDbz != null && (
              <div style={{ color: '#F1F5F9', fontSize: isExpanded ? '11px' : '9px', fontFamily: 'monospace', fontWeight: 700, textShadow: '0 1px 2px #000' }}>
                {maxDbz} dBZ
              </div>
            )}
            {storms.length > 0 && (
              <div style={{ color: '#FCD34D', fontSize: isExpanded ? '9px' : '7.5px', fontFamily: 'monospace', textShadow: '0 1px 2px #000' }}>
                {storms.length} cell{storms.length > 1 ? 's' : ''} detected
              </div>
            )}
          </div>

          <VColorBar
            gradient="linear-gradient(to bottom,#990000 0%,#cc6600 20%,#ccaa00 40%,#009900 60%,#005ce6 80%,#001a66 100%)"
            labels={['60', '50', '40', '30', '20', '10']}
          />
        </DarkCanvas>
      </div>

      {/* Explanatory Legend Area: Explaining what dots and colors represent ONLY when expanded */}
      {isExpanded && (
        /* EXPANDED MODAL VIEW LEGEND (Rich, detailed breakdown like a chart legend) */
        <div style={{
          padding: '12px 18px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Radar Echo & Cell Intensity Legend
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                (Each color indicates precipitation rate & convective severity)
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>
              ● Click/touch any dot on main map to inspect full cell kinematics
            </div>
          </div>

          {/* 4-Color Swatch Grid (Piechart-style breakdown) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px'
          }}>
            {/* 1. Light Rain */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #BAE6FD',
              borderLeft: '4px solid #0284C7',
              borderRadius: '6px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#0284C7', display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369A1' }}>Light Rain</span>
                <span style={{ fontSize: '10px', color: '#0284C7', fontWeight: 600, marginLeft: 'auto' }}>&lt; 25 dBZ</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.3 }}>
                Rainfall &lt; 2.5 mm/h · Initial condensation or drizzle
              </div>
            </div>

            {/* 2. Moderate Rain */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #BBF7D0',
              borderLeft: '4px solid #16A34A',
              borderRadius: '6px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D' }}>Moderate Rain</span>
                <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 600, marginLeft: 'auto' }}>25–35 dBZ</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.3 }}>
                Rainfall 2.5–10 mm/h · Established rain shower cell
              </div>
            </div>

            {/* 3. Heavy Rain */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #FDE68A',
              borderLeft: '4px solid #F59E0B',
              borderRadius: '6px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309' }}>Heavy Rain</span>
                <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 600, marginLeft: 'auto' }}>35–45 dBZ</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.3 }}>
                Rainfall 10–30 mm/h · Deep convective core & downpours
              </div>
            </div>

            {/* 4. Severe Thunderstorm */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #FECACA',
              borderLeft: '4px solid #DC2626',
              borderRadius: '6px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B91C1C' }}>Severe Storm</span>
                <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600, marginLeft: 'auto' }}>≥ 45 dBZ</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.3 }}>
                Rainfall &gt; 30 mm/h · Intense updraft, hail & lightning risk
              </div>
            </div>
          </div>

          {/* Symbols Guide */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '11px',
            color: '#64748B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#0284C7',
                  border: '1.5px solid #FFFFFF',
                  boxShadow: '0 0 0 1px #0284C7'
                }} />
                <span><strong style={{ color: '#0F172A' }}>Colored Dots:</strong> Detected Storm Cells (Centroids)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#38BDF8',
                  border: '1.5px solid #FFFFFF'
                }} />
                <span><strong style={{ color: '#0F172A' }}>Center Dot:</strong> TERLS Radar Origin (Thiruvananthapuram)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '1px',
                  borderTop: '1.5px dashed #94A3B8'
                }} />
                <span><strong style={{ color: '#0F172A' }}>Dashed Rings:</strong> 80 km, 165 km, 250 km Range Markers</span>
              </div>
            </div>
            <div style={{ color: '#0F172A', fontWeight: 600, fontFamily: 'monospace' }}>
              {storms.length} cell{storms.length > 1 ? 's' : ''} in scan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel 3: Vertical Cross-section (Real DWR Volumetric RHI Slice) ────────────
function CrossSection({ selectedStorm, dwrFrameData }) {
  const profile = dwrFrameData?.vertical_profile;
  const topH = selectedStorm?.top_height_km ?? profile?.top_height_km ?? null;
  const maxDbz = selectedStorm?.max_dbz ?? profile?.max_dbz ?? null;
  const vil = selectedStorm?.vil ?? profile?.vil ?? null;
  const rhiUri = profile?.rhi_image_data_uri;

  return (
    <DarkCanvas>
      {rhiUri && (
        <img
          src={rhiUri}
          alt="RHI Vertical Cross-Section"
          style={{
            position: 'absolute',
            left: '30px',
            top: '8px',
            right: '10px',
            bottom: '18px',
            width: 'calc(100% - 40px)',
            height: 'calc(100% - 26px)',
            objectFit: 'fill',
            opacity: 0.85
          }}
        />
      )}
      {/* Coordinate axes overlay */}
      <svg width="100%" height="100%" viewBox="0 0 200 82" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        {[20, 35, 50, 65].map(y => (
          <line key={y} x1="30" y1={y} x2="195" y2={y} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
        ))}
        <line x1="29" y1="12" x2="29" y2="76" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        {[{ y: 20, l: '15' }, { y: 35, l: '10' }, { y: 50, l: '5' }, { y: 65, l: '2' }, { y: 75, l: '0' }].map(({ y, l }) => (
          <text key={y} x={l.length === 2 ? '7' : '12'} y={y + 3} fill="#94A3B8" fontSize="7" fontFamily="monospace">{l}</text>
        ))}
        {topH != null && (
          <>
            <line x1="31" y1={25} x2="80" y2={25} stroke="#FCD34D" strokeWidth="0.8" strokeDasharray="2 2" />
            <text x="82" y="27" fill="#FCD34D" fontSize="7.5" fontFamily="monospace" fontWeight="700">Top {topH} km</text>
          </>
        )}
        <line x1="29" y1="76" x2="195" y2="76" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
        {[-50, -25, 0, 25, 50].map((d, i) => (
          <text key={i} x={30 + i * 41} y="81" fill="#94A3B8" fontSize="6" fontFamily="monospace">{d}</text>
        ))}
        {selectedStorm?.storm_id && (
          <text x="32" y="16" fill="#7DD3FC" fontSize="7" fontFamily="monospace" fontWeight="700">
            {selectedStorm.storm_id} {maxDbz ? `· ${maxDbz} dBZ` : ''} {vil ? `· ${vil} kg/m²` : ''}
          </text>
        )}
      </svg>
    </DarkCanvas>
  );
}

// ── Panel 4: Motion Vectors (Real Farneback Optical Flow) ──────────────────────
function MotionPanel({ dwrFrameData, stormState }) {
  const flowVectors = dwrFrameData?.optical_flow || [];
  const storms = dwrFrameData?.storms || stormState?.storms || [];
  const primaryStorm = storms[0];
  const speed = primaryStorm?.motion?.speed_kmh ?? null;
  const bearing = primaryStorm?.motion?.bearing_cardinal ?? 'NE';

  // Compute maximum optical flow velocity across the grid
  const maxFlowSpeed = flowVectors.length > 0
    ? Math.max(...flowVectors.map(v => v.speed_kmh ?? 0))
    : (speed ?? 32.0);

  return (
    <DarkCanvas>
      <svg width="100%" height="100%" viewBox="0 0 180 80" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Background Grid */}
        {[20, 40, 60].map(y => <line key={y} x1="5" y1={y} x2="155" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />)}
        {[30, 60, 90, 120, 150].map(x => <line key={x} x1={x} y1="5" x2={x} y2="75" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />)}

        {/* Real Farneback Vector Grid */}
        {flowVectors.length > 0 ? (
          flowVectors.map((v, i) => {
            const cx = 15 + (v.col / 128.0) * 140;
            const cy = 10 + (v.row / 128.0) * 60;
            const spd = v.speed_kmh ?? 0;
            const sn = Math.min(1, spd / 50);
            const rad = ((v.direction_deg ?? 45) - 90) * Math.PI / 180;
            const len = 4 + sn * 14;
            const x2 = cx + Math.cos(rad) * len;
            const y2 = cy + Math.sin(rad) * len;
            const col = spd >= 40 ? '#DC2626' : spd >= 25 ? '#EA580C' : spd >= 12 ? '#EAB308' : spd > 3 ? '#10B981' : '#475569';

            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={col} strokeWidth="1.4" strokeLinecap="round" opacity={spd > 2 ? 0.9 : 0.3} />
                <circle cx={x2} cy={y2} r={spd > 15 ? 1.8 : 1.2} fill={col} opacity={spd > 2 ? 0.9 : 0.3} />
              </g>
            );
          })
        ) : (
          // Climatological monsoon advection fallback if flow not yet computed
          [0, 1, 2, 3].map(row => (
            [0, 1, 2, 3, 4].map(col => {
              const cx = 20 + col * 30;
              const cy = 15 + row * 16;
              return (
                <g key={`${row}-${col}`}>
                  <line x1={cx} y1={cy} x2={cx + 10} y2={cy - 7} stroke="#10B981" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
                  <circle cx={cx + 10} cy={cy - 7} r="1.5" fill="#10B981" />
                </g>
              );
            })
          ))
        )}

        {/* Telemetry info */}
        <text x="8" y="14" fill="#F1F5F9" fontSize="8" fontFamily="monospace" fontWeight="700">
          Max {maxFlowSpeed.toFixed(0)} km/h
        </text>
        {speed != null && (
          <text x="8" y="24" fill="#FCD34D" fontSize="7" fontFamily="monospace">
            Storm {speed.toFixed(0)} km/h {bearing}
          </text>
        )}
      </svg>
      <VColorBar
        gradient="linear-gradient(to bottom,#DC2626 0%,#EA580C 25%,#EAB308 50%,#10B981 75%,#0284C7 100%)"
        labels={['60', '45', '30', '15', '5', '0']}
      />
    </DarkCanvas>
  );
}

export default function ScientificPanels({
  currentTimestamp,
  dwrReplayInfo,
  dwrFrameData,
  stormState,
  selectedStorm,
  selectedHazard
}) {
  const tsFormatted = fmtTs(currentTimestamp);
  const isReplay = !!dwrReplayInfo;
  const badge = isReplay ? 'REPLAY' : 'LIVE';
  const effectiveStorm = selectedStorm || dwrFrameData?.storms?.[0] || stormState?.storms?.[0] || null;
  const topHeightLabel = effectiveStorm?.top_height_km != null
    ? `Max: ${effectiveStorm.top_height_km} km` : 'Max: —';
  const motionLabel = effectiveStorm?.motion
    ? `${effectiveStorm.motion.speed_kmh?.toFixed(0) ?? '—'} km/h · ${effectiveStorm.motion.bearing_cardinal ?? ''}`
    : 'Storm motion vectors';

  // Display observation time and Delta_t if available
  const insatObj = dwrFrameData?.insat_frame || stormState?.sensor_data?.satellite;
  const insatObsTs = insatObj?.obs_timestamp;
  const insatTimeDiff = insatObj?.time_difference_minutes;
  const isTemporalValid = insatObj?.temporal_overlap !== false;
  const insatRightLabel = insatObsTs
    ? `${fmtTs(insatObsTs)} (Δt: ${insatTimeDiff != null ? (insatTimeDiff > 0 ? `+${insatTimeDiff}` : insatTimeDiff) : '0'}m)`
    : tsFormatted;

  const [expandedCard, setExpandedCard] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExpandedCard(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isInsatOverlap = insatObj?.spatial_overlap !== false;
  const insatDist = insatObj?.spatial_relationship?.distance_to_boundary_km ?? 378;

  const cardsMeta = {
    insat: {
      title: 'INSAT-3D IR (°C)',
      badge: 'REPLAY',
      badgeColor: { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' },
      rightLabel: insatRightLabel,
      footer: (
        <><span>MOSDAC TIR-1 (10.8 µm)</span><span>Real H5 · {insatObj?.filename?.slice(0, 22) || '3DIMG_07NOV2019'}</span></>
      ),
      component: <InsatPanel dwrFrameData={dwrFrameData} stormState={stormState} />
    },
    dwr: {
      title: 'DWR Reflectivity (dBZ)',
      badge,
      rightLabel: tsFormatted,
      footer: <><span>TERLS C-Band (250 km)</span><span>ConvGRU · 30,369 params</span></>,
      component: <DwrPanel dwrFrameData={dwrFrameData} stormState={stormState} isExpanded={true} />
    },
    cross_section: {
      title: 'Vertical Cross-section (DWR)',
      badge: null,
      rightLabel: topHeightLabel,
      footer: <><span>Height (km) vs Distance (km)</span><span>Volumetric Scan Extent</span></>,
      component: <CrossSection selectedStorm={effectiveStorm} dwrFrameData={dwrFrameData} />
    },
    motion: {
      title: 'Motion Vectors (Optical Flow)',
      badge: null,
      rightLabel: 'Speed (km/h)',
      footer: <><span>Centroid · {motionLabel}</span><span>Farneback Optical Flow</span></>,
      component: <MotionPanel dwrFrameData={dwrFrameData} stormState={stormState} />
    }
  };

  const activeExpanded = expandedCard ? cardsMeta[expandedCard] : null;

  return (
    <>
      {isMinimized ? (
        <div
          style={{
            height: '28px',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
            boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.02)',
            zIndex: 10
          }}
        >
          <div
            onClick={() => setIsMinimized(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            title="Click to restore scientific diagnostic panels"
          >
            <Activity size={13} color="#2563EB" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B' }}>
              Scientific Diagnostics & Cross-Sections
            </span>
            <span style={{
              fontSize: '9.5px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '3px',
              background: '#F1F5F9',
              color: '#64748B',
              border: '1px solid #E2E8F0'
            }}>
              INSAT-3D IR · DWR dBZ · Vertical Slice · Optical Flow (Minimized)
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(false)}
            title="Expand Diagnostic Panels"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '4px',
              color: '#2563EB',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ChevronUp size={13} />
            <span>Show Diagnostics</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flexShrink: 0, zIndex: 10 }}>
          {/* Header strip with minimize toggle */}
          <div style={{
            height: '24px',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Multi-Sensor Scientific Diagnostics
              </span>
              <span style={{ fontSize: '9px', color: '#94A3B8' }}>
                (INSAT-3D, DWR C-Band, Volumetric RHI, Optical Flow)
              </span>
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              title="Minimize Diagnostic Panels to expand map view"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                color: '#64748B',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <ChevronDown size={12} />
              <span>Minimize</span>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '4px 16px 7px 16px',
            background: '#F5F7FA',
            borderTop: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0',
            height: '185px',
            flexShrink: 0
          }}>
            {/* 1. INSAT-3D IR (Real MOSDAC Observation Raster) */}
            <PanelCard
              title="INSAT-3D IR (°C)"
              badge={cardsMeta.insat.badge}
              badgeColor={cardsMeta.insat.badgeColor}
              rightLabel={insatRightLabel}
              onExpand={() => setExpandedCard('insat')}
              footer={cardsMeta.insat.footer}
            >
              <InsatPanel dwrFrameData={dwrFrameData} stormState={stormState} />
            </PanelCard>

            {/* 2. DWR Reflectivity (Real TERLS Radar Replay) */}
            <PanelCard
              title="DWR Reflectivity (dBZ)"
              badge={badge}
              rightLabel={tsFormatted}
              onExpand={() => setExpandedCard('dwr')}
              footer={<><span>TERLS C-Band (250 km)</span><span>ConvGRU · 30,369 params</span></>}
            >
              <DwrPanel dwrFrameData={dwrFrameData} stormState={stormState} isExpanded={false} />
            </PanelCard>

            {/* 3. Vertical Cross-section (Real DWR Volumetric RHI Slice) */}
            <PanelCard
              title="Vertical Cross-section (DWR)"
              rightLabel={topHeightLabel}
              onExpand={() => setExpandedCard('cross_section')}
              footer={<><span>Height (km) vs Distance (km)</span><span>Volumetric Scan Extent</span></>}
            >
              <CrossSection selectedStorm={effectiveStorm} dwrFrameData={dwrFrameData} />
            </PanelCard>

            {/* 4. Motion Vectors (Real Farneback Optical Flow) */}
            <PanelCard
              title="Motion Vectors (Optical Flow)"
              rightLabel="Speed (km/h)"
              onExpand={() => setExpandedCard('motion')}
              footer={<><span>Centroid · {motionLabel}</span><span>Farneback Optical Flow</span></>}
            >
              <MotionPanel dwrFrameData={dwrFrameData} stormState={stormState} />
            </PanelCard>
          </div>
        </div>
      )}

      {/* Expanded Focused Viewer Modal */}
      {activeExpanded && (
        <div
          onClick={() => setExpandedCard(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: 'min(92vw, 1060px)',
              height: 'min(82vh, 680px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  {activeExpanded.title}
                </span>
                {activeExpanded.badge && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: activeExpanded.badgeColor?.bg || '#DBEAFE',
                    color: activeExpanded.badgeColor?.text || '#1E40AF',
                    border: `1px solid ${activeExpanded.badgeColor?.border || '#93C5FD'}`
                  }}>
                    {activeExpanded.badge}
                  </span>
                )}
                {activeExpanded.rightLabel && (
                  <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                    {activeExpanded.rightLabel}
                  </span>
                )}
              </div>
              <button
                onClick={() => setExpandedCard(null)}
                title="Close expanded viewer (Esc)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <X size={15} />
                <span>Close</span>
              </button>
            </div>

            {/* Modal Content - Exact same visualization, now enlarged */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#0D1624' }}>
              {activeExpanded.component}
            </div>

            {/* Modal Footer */}
            {activeExpanded.footer && (
              <div style={{
                padding: '10px 20px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: '#64748B'
              }}>
                {activeExpanded.footer}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
