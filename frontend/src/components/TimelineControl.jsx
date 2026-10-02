import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Radio,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TimelineControl({
  timestamps = [],
  currentTimestamp,
  thumbnails = [],
  onSelectTimestamp,
  isLive = false,
  onToggleLive,
  isLoading = false,
  isPlaying: propIsPlaying,
  setIsPlaying: propSetIsPlaying
}) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : internalIsPlaying;
  const setIsPlaying = propSetIsPlaying || setInternalIsPlaying;
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const currentIndex = Math.max(0, timestamps.indexOf(currentTimestamp));

  // Auto-play loop
  useEffect(() => {
    let timer = null;
    if (isPlaying && timestamps.length > 0) {
      const intervalMs = Math.round(1800 / playbackSpeed);
      timer = setInterval(() => {
        const nextIdx = (currentIndex + 1) % timestamps.length;
        onSelectTimestamp(timestamps[nextIdx]);
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentIndex, timestamps, playbackSpeed, onSelectTimestamp]);

  const handleStepBack = () => {
    if (timestamps.length === 0) return;
    const prevIdx = (currentIndex - 1 + timestamps.length) % timestamps.length;
    onSelectTimestamp(timestamps[prevIdx]);
  };

  const handleStepForward = () => {
    if (timestamps.length === 0) return;
    const nextIdx = (currentIndex + 1) % timestamps.length;
    onSelectTimestamp(timestamps[nextIdx]);
  };

  const speeds = [0.5, 1, 2, 4];

  const formatTimeOnly = (iso) => {
    if (!iso) return '--:--';
    const parts = iso.split('T');
    if (parts.length > 1) {
      return parts[1].substring(0, 5);
    }
    return iso;
  };

  return (
    <div style={{
      width: '100%',
      padding: '7px 18px 6px 18px',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      borderTop: '1px solid #E2E8F0',
      zIndex: 10,
      flexShrink: 0,
      boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Top row: controls + scrubber bar + live status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Left: Playback buttons + speeds */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Replay' : 'Play Replay'}
            className="box-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#2563EB',
              border: '1px solid #1D4ED8',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            {isPlaying ? <Pause size={13} fill="#FFFFFF" /> : <Play size={13} fill="#FFFFFF" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={handleStepBack}
            title="Step Back 10 min"
            className="box-btn"
            style={{
              padding: '6px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SkipBack size={13} strokeWidth={2.2} />
          </button>

          <button
            onClick={handleStepForward}
            title="Step Forward 10 min"
            className="box-btn"
            style={{
              padding: '6px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SkipForward size={13} strokeWidth={2.2} />
          </button>

          {/* Speed selectors */}
          <div 
            className="box-card"
            style={{
              display: 'flex',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
              marginLeft: '4px',
              padding: '1px'
            }}
          >
            {speeds.map(s => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                style={{
                  background: playbackSpeed === s ? '#2563EB' : 'transparent',
                  color: playbackSpeed === s ? '#FFFFFF' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Interactive Scrubber Slider */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '780px' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min={0}
              max={Math.max(0, timestamps.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (timestamps[idx]) {
                  onSelectTimestamp(timestamps[idx]);
                }
              }}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#CBD5E1',
                outline: 'none',
                cursor: 'pointer',
                accentColor: '#2563EB'
              }}
            />
          </div>
        </div>

        {/* Right: Historical Replay toggle + Auto Update toggle + Go To Live */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Historical Replay toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '28px',
              height: '16px',
              borderRadius: '8px',
              background: '#2563EB',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <div style={{
                position: 'absolute',
                right: '2px',
                top: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#FFFFFF'
              }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155' }}>
              Historical Replay
            </span>
          </div>

          {/* Auto Update toggle */}
          <div 
            onClick={() => setAutoUpdate(!autoUpdate)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <div style={{
              width: '28px',
              height: '16px',
              borderRadius: '8px',
              background: autoUpdate ? '#2563EB' : '#CBD5E1',
              position: 'relative',
              transition: 'background 0.15s ease'
            }}>
              <div style={{
                position: 'absolute',
                left: autoUpdate ? '14px' : '2px',
                top: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#FFFFFF',
                transition: 'left 0.15s ease'
              }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B' }}>
              Auto Update
            </span>
          </div>

          {/* Go To Live button */}
          <button
            onClick={onToggleLive}
            className="box-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '7px',
              background: isLive ? '#16A34A' : '#FFFFFF',
              border: isLive ? '1px solid #15803D' : '1px solid #CBD5E1',
              color: isLive ? '#FFFFFF' : '#1E293B',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <Radio size={13} color={isLive ? '#FFFFFF' : '#2563EB'} strokeWidth={2.2} />
            <span>{isLive ? 'In Live Mode' : 'Go To Live'}</span>
          </button>

          {/* Minimize/Expand Filmstrip Thumbnails */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            title={showThumbnails ? 'Minimize radar thumbnail filmstrip' : 'Show radar thumbnail filmstrip'}
            className="box-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: showThumbnails ? '#F8FAFC' : '#EFF6FF',
              border: '1px solid #CBD5E1',
              color: showThumbnails ? '#64748B' : '#2563EB',
              fontSize: '10.5px',
              fontWeight: 700
            }}
          >
            {showThumbnails ? <ChevronDown size={12} strokeWidth={2.2} /> : <ChevronUp size={12} strokeWidth={2.2} />}
            <span>Filmstrip</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Thumbnail frames for radar sequences */}
      {showThumbnails && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        overflowX: 'auto',
        padding: '3px 0 2px 0',
        whiteSpace: 'nowrap'
      }}>
        {timestamps.map((ts, idx) => {
          const isSelected = ts === currentTimestamp;
          return (
            <div
              key={ts}
              id={`timeline-frame-${idx}`}
              onClick={() => onSelectTimestamp(ts)}
              className="box-card-interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 6px',
                borderRadius: '7px',
                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                minWidth: '60px',
                boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.18)' : '0 1px 2px rgba(15,23,42,0.04)'
              }}
            >
              {/* Mini radar thumbnail preview */}
              <div style={{
                width: '48px',
                height: '24px',
                borderRadius: '4px',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {thumbnails && thumbnails[idx] ? (
                  <img
                    src={thumbnails[idx]}
                    alt={`radar-${idx}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: isSelected
                      ? 'radial-gradient(circle at center, #DC2626 0%, #EA580C 35%, #2563EB 85%)'
                      : 'radial-gradient(circle at center, #0284C7 0%, #0F172A 100%)'
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '8.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? '#2563EB' : '#64748B'
              }}>
                {formatTimeOnly(ts)}
              </span>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
