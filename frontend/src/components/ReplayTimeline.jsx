import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

export default function ReplayTimeline({
  timestamps = [],
  currentTimestamp,
  onSelectTimestamp,
  isLoading = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const currentIndex = timestamps.indexOf(currentTimestamp);

  // Auto-play interval timer
  useEffect(() => {
    let timer = null;
    if (isPlaying && timestamps.length > 0) {
      timer = setInterval(() => {
        const nextIdx = (currentIndex + 1) % timestamps.length;
        onSelectTimestamp(timestamps[nextIdx]);
      }, 2400); // 2.4s per historical satellite frame
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentIndex, timestamps, onSelectTimestamp]);

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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 18px',
      background: 'rgba(10, 15, 26, 0.95)',
      borderTop: '1px solid rgba(56, 189, 248, 0.2)',
      backdropFilter: 'blur(10px)',
      gap: '16px'
    }}>
      {/* Playback Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleStepBack}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#cbd5e1',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px'
          }}
          title="Previous Frame (|◀)"
        >
          <SkipBack size={14} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(2, 132, 199, 0.25)',
            border: `1px solid ${isPlaying ? '#ef4444' : '#38bdf8'}`,
            color: isPlaying ? '#f87171' : '#38bdf8',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            fontSize: '12px',
            minWidth: '85px',
            justifyContent: 'center'
          }}
        >
          {isPlaying ? (
            <>
              <Pause size={14} /> Pause
            </>
          ) : (
            <>
              <Play size={14} /> Replay
            </>
          )}
        </button>

        <button
          onClick={handleStepForward}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#cbd5e1',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px'
          }}
          title="Next Frame (▶|)"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Frame Timeline Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: 1,
        overflowX: 'auto',
        padding: '2px 6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '11px', marginRight: '6px' }}>
          <Clock size={12} />
          <span>TIMELINE:</span>
        </div>

        {timestamps.map((ts, idx) => {
          const isSelected = ts === currentTimestamp;
          // Format time only (e.g. 05:00 UTC)
          const timeOnly = ts.split('T')[1]?.replace(':00Z', ' UTC') || ts;

          return (
            <button
              key={ts}
              onClick={() => onSelectTimestamp(ts)}
              style={{
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(51, 65, 85, 0.6)',
                background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {timeOnly}
            </button>
          );
        })}
      </div>

      {/* Replay State Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Frame <strong style={{ color: '#f8fafc' }}>{currentIndex + 1}</strong> of {timestamps.length}
        </span>
        {isLoading && (
          <span style={{ fontSize: '10px', color: '#38bdf8', animation: 'pulse 1s infinite' }}>
            Processing Pipeline...
          </span>
        )}
      </div>
    </div>
  );
}
