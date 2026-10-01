import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Radio
} from 'lucide-react';

export default function TimelineControl({
  timestamps = [],
  currentTimestamp,
  thumbnails = [],
  onSelectTimestamp,
  isLive = false,
  onToggleLive,
  isLoading = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoUpdate, setAutoUpdate] = useState(false);

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
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            {isPlaying ? <Pause size={13} fill="#FFFFFF" /> : <Play size={13} fill="#FFFFFF" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={handleStepBack}
            title="Step Back 10 min"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '5px',
              color: '#475569',
              padding: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SkipBack size={12} />
          </button>

          <button
            onClick={handleStepForward}
            title="Step Forward 10 min"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '5px',
              color: '#475569',
              padding: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SkipForward size={12} />
          </button>

          {/* Speed selectors */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '5px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            marginLeft: '4px'
          }}>
            {speeds.map(s => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                style={{
                  background: playbackSpeed === s ? '#2563EB' : 'transparent',
                  color: playbackSpeed === s ? '#FFFFFF' : '#64748B',
                  border: 'none',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  cursor: 'pointer'
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: isLive ? '#16A34A' : '#FFFFFF',
              border: isLive ? '1px solid #16A34A' : '1px solid #CBD5E1',
              color: isLive ? '#FFFFFF' : '#334155',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={13} color={isLive ? '#FFFFFF' : '#2563EB'} />
            <span>{isLive ? 'In Live Mode' : 'Go To Live'}</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Thumbnail frames for radar sequences */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        padding: '2px 0',
        whiteSpace: 'nowrap'
      }}>
        {timestamps.map((ts, idx) => {
          const isSelected = ts === currentTimestamp;
          return (
            <div
              key={ts}
              id={`timeline-frame-${idx}`}
              onClick={() => onSelectTimestamp(ts)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '2px 4px',
                borderRadius: '5px',
                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                cursor: 'pointer',
                minWidth: '58px',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Mini radar thumbnail preview */}
              <div style={{
                width: '46px',
                height: '22px',
                borderRadius: '3px',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                border: isSelected ? '1.5px solid #2563EB' : '1px solid rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none'
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
                fontFamily: 'monospace',
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? '#2563EB' : '#64748B'
              }}>
                {formatTimeOnly(ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
