import React from 'react';


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

function PanelCard({ title, badge, rightLabel, footer, children }) {
  return (
    <div style={{
      background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'8px',
      padding:'8px 10px', display:'flex', flexDirection:'column',
      justifyContent:'space-between', position:'relative',
      overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:'11px', fontWeight:800, color:'#0F172A' }}>{title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          {badge && <span style={{ fontSize:'8px', fontWeight:800, padding:'1px 5px', borderRadius:'3px', background:'#DBEAFE', color:'#1E40AF', border:'1px solid #93C5FD' }}>{badge}</span>}
          {rightLabel && <span style={{ fontSize:'9px', color:'#64748B', fontFamily:'monospace' }}>{rightLabel}</span>}
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

  return (
    <DarkCanvas>
      {imageUri ? (
        <img
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
            Obs: {obsTs}
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
function DwrPanel({ dwrFrameData, stormState }) {
  const storms = dwrFrameData?.storms || stormState?.storms || [];
  const maxDbz = storms.length > 0 ? Math.max(...storms.map(s => s.max_dbz ?? 0)) : (dwrFrameData?.dbz_max_pred ? Math.round(dwrFrameData.dbz_max_pred * 70) : null);
  const imageUri = dwrFrameData?.dwr_image_data_uri;

  return (
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
      {/* Range rings overlay */}
      <svg width="100%" height="100%" viewBox="0 0 180 80" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        {[0.33, 0.66, 1.0].map((r, i) => (
          <circle key={i} cx="90" cy="40" r={r * 36} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" strokeDasharray="2 2" />
        ))}
        <line x1="90" y1="4" x2="90" y2="76" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
        <line x1="54" y1="40" x2="126" y2="40" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      </svg>
      {/* Telemetry labels */}
      <div style={{ position: 'absolute', top: '6px', left: '8px', zIndex: 2, pointerEvents: 'none' }}>
        {maxDbz != null && (
          <div style={{ color: '#F1F5F9', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, textShadow: '0 1px 2px #000' }}>
            {maxDbz} dBZ
          </div>
        )}
        {storms.length > 0 && (
          <div style={{ color: '#FCD34D', fontSize: '7.5px', fontFamily: 'monospace', textShadow: '0 1px 2px #000' }}>
            {storms.length} cell{storms.length > 1 ? 's' : ''} detected
          </div>
        )}
      </div>
      <VColorBar
        gradient="linear-gradient(to bottom,#990000 0%,#cc6600 20%,#ccaa00 40%,#009900 60%,#005ce6 80%,#001a66 100%)"
        labels={['60', '50', '40', '30', '20', '10']}
      />
    </DarkCanvas>
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

  // Display observation time if half-hourly scan differs from 10-min replay time
  const insatObsTs = dwrFrameData?.insat_frame?.obs_timestamp || stormState?.sensor_data?.satellite?.obs_timestamp;
  const insatRightLabel = insatObsTs && insatObsTs !== currentTimestamp
    ? `${fmtTs(insatObsTs)} (Obs)`
    : tsFormatted;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      padding: '7px 16px',
      background: '#F5F7FA',
      borderTop: '1px solid #E2E8F0',
      borderBottom: '1px solid #E2E8F0',
      height: '175px',
      flexShrink: 0
    }}>
      {/* 1. INSAT-3D IR (Real MOSDAC Observation Raster) */}
      <PanelCard
        title="INSAT-3D IR (°C)"
        badge={badge}
        rightLabel={insatRightLabel}
        footer={<><span>MOSDAC TIR-1 (10.8 µm)</span><span>Real H5 [170K, 330K]</span></>}
      >
        <InsatPanel dwrFrameData={dwrFrameData} stormState={stormState} />
      </PanelCard>

      {/* 2. DWR Reflectivity (Real TERLS Radar Replay) */}
      <PanelCard
        title="DWR Reflectivity (dBZ)"
        badge={badge}
        rightLabel={tsFormatted}
        footer={<><span>TERLS C-Band (250 km)</span><span>ConvGRU · 30,369 params</span></>}
      >
        <DwrPanel dwrFrameData={dwrFrameData} stormState={stormState} />
      </PanelCard>

      {/* 3. Vertical Cross-section (Real DWR Volumetric RHI Slice) */}
      <PanelCard
        title="Vertical Cross-section (DWR)"
        rightLabel={topHeightLabel}
        footer={<><span>Height (km) vs Distance (km)</span><span>Volumetric Scan Extent</span></>}
      >
        <CrossSection selectedStorm={effectiveStorm} dwrFrameData={dwrFrameData} />
      </PanelCard>

      {/* 4. Motion Vectors (Real Farneback Optical Flow) */}
      <PanelCard
        title="Motion Vectors (Optical Flow)"
        rightLabel="Speed (km/h)"
        footer={<><span>Centroid · {motionLabel}</span><span>Farneback Optical Flow</span></>}
      >
        <MotionPanel dwrFrameData={dwrFrameData} stormState={stormState} />
      </PanelCard>
    </div>
  );
}
