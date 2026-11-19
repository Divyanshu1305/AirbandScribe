import React, { useRef, useEffect, useState, useCallback } from 'react';

function fmtDuration(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtZulu(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export default function WaveformScope({
  audioUrl,
  audioBlob,
  segments = [],
  duration = 0,
  playhead = 0,
  isPlaying = false,
  onSeek,
  onTogglePlay,
  audioChannel = 'denoised', // 'denoised' | 'filtered'
  onToggleAudioChannel,
  playbackRate = 1.0,
  onChangePlaybackRate,
  loopSegment = false,
  onToggleLoop,
  activeSegIdx = -1
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pcmPeaks, setPcmPeaks] = useState(null); // Array of { min, max }
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [decodeError, setDecodeError] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(null);

  // Decode genuine audio samples via Web Audio API
  useEffect(() => {
    let isCancelled = false;

    const decodeAudioBuffer = async () => {
      // Need either a direct Blob/File or a valid URL
      if (!audioBlob && !audioUrl) {
        setPcmPeaks(null);
        return;
      }

      setIsDecodingAudio(true);
      setDecodeError(null);

      try {
        let arrayBuffer;
        if (audioBlob) {
          arrayBuffer = await audioBlob.arrayBuffer();
        } else if (audioUrl) {
          const res = await fetch(audioUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          arrayBuffer = await res.arrayBuffer();
        }

        if (isCancelled || !arrayBuffer) return;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = decoded.getChannelData(0); // Primary mono channel
        const totalSamples = channelData.length;

        // Downsample into 1000 peak pairs
        const numBuckets = 1000;
        const bucketSize = Math.max(1, Math.floor(totalSamples / numBuckets));
        const peaks = [];

        for (let i = 0; i < numBuckets; i++) {
          const start = i * bucketSize;
          const end = Math.min(start + bucketSize, totalSamples);
          let min = 0;
          let max = 0;

          for (let j = start; j < end; j++) {
            const val = channelData[j];
            if (val > max) max = val;
            if (val < min) min = val;
          }

          peaks.push({ min, max });
        }

        audioCtx.close();
        if (!isCancelled) {
          setPcmPeaks(peaks);
          setIsDecodingAudio(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Audio PCM extraction warning:", err.message);
          setDecodeError(err.message);
          setIsDecodingAudio(false);
          setPcmPeaks(null);
        }
      }
    };

    decodeAudioBuffer();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl, audioBlob]);

  // Render HTML5 Canvas
  const drawScope = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = containerRef.current?.clientWidth || 800;
    const height = canvas.height = 130;

    // 1. Dark Cockpit Instrument Surface
    ctx.fillStyle = '#18272A';
    ctx.fillRect(0, 0, width, height);

    // 2. Calibrated Oscilloscope Grid Lines
    ctx.strokeStyle = '#25393D';
    ctx.lineWidth = 1;

    // Time division lines
    const effectiveDuration = duration > 0 ? duration : 30;
    const timeStepSec = effectiveDuration > 120 ? 30 : effectiveDuration > 60 ? 15 : 5;
    const numTimeDivs = Math.floor(effectiveDuration / timeStepSec);

    for (let i = 0; i <= numTimeDivs; i++) {
      const sec = i * timeStepSec;
      const x = (sec / effectiveDuration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Time ruler text at top
      ctx.fillStyle = '#667278';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(fmtDuration(sec), x + 4, 12);
    }

    // Horizontal amplitude lines (+1.0, 0.0, -1.0)
    const midY = height / 2 + 10;
    ctx.strokeStyle = '#203236';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // 3. VAD Active Speech Boundaries (Shaded Underlay)
    if (segments && segments.length > 0 && effectiveDuration > 0) {
      segments.forEach((seg, sIdx) => {
        const x1 = (seg.start / effectiveDuration) * width;
        const x2 = (seg.end / effectiveDuration) * width;
        const segW = Math.max(x2 - x1, 2);
        const isActive = activeSegIdx === sIdx || (playhead >= seg.start && playhead <= seg.end);

        // Highlight active speech window
        ctx.fillStyle = isActive ? 'rgba(75, 153, 126, 0.22)' : 'rgba(40, 107, 99, 0.08)';
        ctx.fillRect(x1, 18, segW, height - 18);

        ctx.strokeStyle = isActive ? 'rgba(75, 153, 126, 0.8)' : 'rgba(40, 107, 99, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, 18, segW, height - 18);
      });
    }

    // 4. Render True PCM Decimated Waveform (or fallback baseline)
    if (pcmPeaks && pcmPeaks.length > 0) {
      const numPeaks = pcmPeaks.length;
      const playheadX = effectiveDuration > 0 ? (playhead / effectiveDuration) * width : 0;
      const availableH = (height - 30) / 2;

      for (let i = 0; i < numPeaks; i++) {
        const x = (i / numPeaks) * width;
        const { min, max } = pcmPeaks[i];
        const isPast = x <= playheadX;

        // Color based on playback position
        ctx.fillStyle = isPast ? '#4B997E' : '#286B63';

        const topY = midY - Math.abs(max) * availableH;
        const bottomY = midY + Math.abs(min) * availableH;
        const barH = Math.max(bottomY - topY, 1.5);

        ctx.fillRect(x, topY, Math.max(width / numPeaks, 1.2), barH);
      }
    } else {
      // Truthful baseline when no PCM data decoded
      ctx.fillStyle = '#667278';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      if (isDecodingAudio) {
        ctx.fillText('Decoding authentic audio PCM waveform samples...', width / 2, midY);
      } else {
        ctx.fillText('No audio waveform loaded. Ingest VHF recording to view oscilloscope trace.', width / 2, midY);
      }
    }

    // 5. Playhead Cursor (Amber #E5A958 Line with Top Badge)
    if (effectiveDuration > 0) {
      const playX = (playhead / effectiveDuration) * width;

      // Scrubber line
      ctx.strokeStyle = '#E5A958';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Top playhead marker badge
      ctx.fillStyle = '#E5A958';
      ctx.beginPath();
      ctx.moveTo(playX - 5, 0);
      ctx.lineTo(playX + 5, 0);
      ctx.lineTo(playX, 7);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Hover Cursor
    if (hoverX !== null && hoverTime !== null) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hoverX, 18);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [duration, playhead, pcmPeaks, segments, activeSegIdx, isDecodingAudio, hoverX, hoverTime]);

  useEffect(() => {
    drawScope();
  }, [drawScope]);

  // Click to seek
  const handleCanvasClick = (e) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = (clickX / rect.width) * duration;
    onSeek(targetSec);
  };

  // Hover indicator
  const handleMouseMove = (e) => {
    if (!canvasRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const targetSec = (x / rect.width) * duration;
    setHoverX(x);
    setHoverTime(targetSec);
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    setHoverTime(null);
  };

  return (
    <section className="airband-card" style={{ padding: '14px', backgroundColor: 'var(--color-surface-0)' }}>
      {/* Top Header of Scope */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '10px'
      }}>
        {/* Title & Channel Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-0)',
            letterSpacing: '0.04em'
          }}>
            ACOUSTIC WAVEFORM & SPEECH ACTIVITY
          </span>

          {/* A/B Audio Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}>
            <button
              onClick={() => onToggleAudioChannel('denoised')}
              style={{
                background: audioChannel === 'denoised' ? 'var(--color-pine-pri)' : 'transparent',
                color: audioChannel === 'denoised' ? '#FFFFFF' : 'var(--color-text-1)',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              CLEANED VHF
            </button>
            <button
              onClick={() => onToggleAudioChannel('filtered')}
              style={{
                background: audioChannel === 'filtered' ? 'var(--color-pine-pri)' : 'transparent',
                color: audioChannel === 'filtered' ? '#FFFFFF' : 'var(--color-text-1)',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              BANDPASS RAW
            </button>
          </div>
        </div>

        {/* Transport & Playback Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time Readout */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-0)',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span>{fmtZulu(playhead)}</span>
            <span style={{ color: 'var(--color-text-2)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--color-text-1)' }}>{fmtDuration(duration)}</span>
          </div>

          {/* Speed Selector */}
          <select
            value={playbackRate}
            onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
            className="form-select"
            style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 6px' }}
          >
            <option value="0.75">0.75x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>

          {/* Loop Toggle */}
          <button
            onClick={onToggleLoop}
            style={{
              backgroundColor: loopSegment ? 'var(--color-amber-sub)' : 'var(--color-surface-1)',
              color: loopSegment ? 'var(--color-amber-pri)' : 'var(--color-text-1)',
              border: loopSegment ? '1px solid var(--color-amber-pri)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            {loopSegment ? '⟲ LOOP ON' : '⟲ LOOP'}
          </button>

          {/* Primary Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="btn-action-primary"
            style={{ padding: '5px 14px', fontSize: '12px' }}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
        </div>
      </div>

      {/* Scope Canvas Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid #25393D',
          cursor: 'pointer'
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block', width: '100%', height: '130px' }}
        />

        {/* Hover Tooltip */}
        {hoverTime !== null && hoverX !== null && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(Math.max(hoverX - 30, 8), (containerRef.current?.clientWidth || 800) - 70)}px`,
            top: '22px',
            backgroundColor: 'rgba(24, 39, 42, 0.9)',
            border: '1px solid #395257',
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            pointerEvents: 'none'
          }}>
            {fmtZulu(hoverTime)}
          </div>
        )}
      </div>

      {/* Scope Footer Meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '6px',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-2)'
      }}>
        <span>VAD Voiceband: 300 Hz – 3,400 Hz (IIR 5th Order)</span>
        <span>Space: Play/Pause | ← / →: Seek 5s | A: Toggle Audio Channel</span>
      </div>
    </section>
  );
}

