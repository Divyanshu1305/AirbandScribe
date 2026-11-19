import React, { useState } from 'react';

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

export default function PresentationMode({
  dataset,
  onClose,
  playhead,
  isPlaying,
  onTogglePlay,
  onSeek,
  activeSegIdx,
  onSeekToSegment
}) {
  const [activeStage, setActiveStage] = useState(1);
  const segments = dataset?.segments || [];
  const duration = dataset?.speech_duration_seconds || 1;

  const currentSegment = activeSegIdx >= 0 && activeSegIdx < segments.length
    ? segments[activeSegIdx]
    : segments[0] || null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-app-bg)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      overflowY: 'auto'
    }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: 'var(--color-amber-sub)',
            color: 'var(--color-amber-pri)',
            border: '1px solid var(--color-amber-pri)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)'
          }}>
            ACADEMIC EVALUATION & RESEARCH DEMONSTRATION MODE
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-0)' }}>
            Benchmark Record: {dataset?.filename || 'sample_atc.wav'}
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)' }}>
            ({fmtDuration(duration)}, {segments.length} transmissions)
          </span>
        </div>

        <button
          onClick={onClose}
          className="btn-action-secondary"
          style={{ fontWeight: 600 }}
        >
          ✕ Exit Presentation Mode (ESC)
        </button>
      </div>

      {/* 4-Step Pipeline Walkthrough Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {[
          { num: 1, title: '1. Ingestion & 16kHz Sampling', desc: 'Resampling, 62.5µs interval, Nyquist limit' },
          { num: 2, title: '2. Butterworth & Spectral Denoising', desc: '300-3400Hz voiceband bandpass, STFT gate' },
          { num: 3, title: '3. Silero VAD & Chunking', desc: '30s sliding window, 5s overlap boundary' },
          { num: 4, title: '4. ICAO Extraction & Telemetry', desc: 'Callsign, runway, heading regex normalizer' }
        ].map((step) => {
          const isSelected = activeStage === step.num;
          return (
            <div
              key={step.num}
              onClick={() => setActiveStage(step.num)}
              className="airband-card"
              style={{
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--color-pine-sub)' : 'var(--color-surface-0)',
                borderLeft: isSelected ? '4px solid var(--color-pine-pri)' : '1px solid var(--color-border)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: isSelected ? 'var(--color-pine-pri)' : 'var(--color-text-0)'
              }}>
                {step.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-1)', marginTop: '2px' }}>
                {step.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Core Presentation Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '20px',
        flex: 1
      }}>
        {/* Left Column: Active Transmission & Transport */}
        <div className="airband-card" style={{ padding: '20px', backgroundColor: 'var(--color-surface-0)' }}>
          <div style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--color-text-2)',
            marginBottom: '12px'
          }}>
            ACTIVE TRANSMISSION SEGMENT INSPECTOR
          </div>

          {currentSegment ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 700, color: 'var(--color-pine-pri)' }}>
                  #{activeSegIdx >= 0 ? activeSegIdx + 1 : 1}
                </span>
                <span style={{ color: 'var(--color-text-0)' }}>
                  [{fmtZulu(currentSegment.start)} → {fmtZulu(currentSegment.end)}]
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-1)' }}>
                  Duration: {(currentSegment.end - currentSegment.start).toFixed(2)}s
                </span>
              </div>

              {/* Large High-Contrast Transcript Text */}
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '18px',
                lineHeight: '28px',
                fontWeight: 500,
                color: 'var(--color-text-0)',
                marginBottom: '20px'
              }}>
                "{currentSegment.text}"
              </div>

              {/* Transport Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={onTogglePlay}
                  className="btn-action-primary"
                  style={{ padding: '8px 20px', fontSize: '14px' }}
                >
                  {isPlaying ? '⏸ PAUSE DEMO' : '▶ PLAY DEMO AUDIO'}
                </button>
                <button
                  onClick={() => {
                    const prevIdx = Math.max(0, (activeSegIdx >= 0 ? activeSegIdx : 0) - 1);
                    onSeekToSegment(segments[prevIdx].start);
                  }}
                  className="btn-action-secondary"
                  disabled={activeSegIdx <= 0}
                >
                  ◀ Previous Transmission
                </button>
                <button
                  onClick={() => {
                    const nextIdx = Math.min(segments.length - 1, (activeSegIdx >= 0 ? activeSegIdx : 0) + 1);
                    onSeekToSegment(segments[nextIdx].start);
                  }}
                  className="btn-action-secondary"
                  disabled={activeSegIdx >= segments.length - 1}
                >
                  Next Transmission ▶
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-1)', fontSize: '14px' }}>
              No transmission segments in benchmark dataset.
            </div>
          )}
        </div>

        {/* Right Column: Stage Explanation & System Metrics */}
        <div className="airband-card" style={{ padding: '20px', backgroundColor: 'var(--color-surface-0)' }}>
          <div style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--color-text-2)',
            marginBottom: '12px'
          }}>
            STAGE TECHNICAL EXPLANATION
          </div>

          {activeStage === 1 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
                1. Acoustic Ingestion & Discrete Sampling
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-1)', lineHeight: '20px' }}>
                Raw audio is received in arbitrary container formats and resampled strictly to <strong>16,000 Hz</strong> 16-bit linear PCM.
                At 16 kHz, each sample represents <strong>62.5 microseconds</strong> of acoustic history. The Nyquist bound of 8,000 Hz ensures
                aliasing-free voiceband preservation.
              </p>
            </div>
          )}

          {activeStage === 2 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
                2. Butterworth Filtering & Spectral Noise Gating
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-1)', lineHeight: '20px' }}>
                A 5th-order digital IIR Butterworth bandpass filter suppresses RF sub-carrier hum (&lt; 300 Hz) and HF hiss (&gt; 3,400 Hz).
                Spectral gating then estimates the non-speech noise floor via short-time Fourier transform (STFT) and attenuates stationary
                cockpit engine and radio static.
              </p>
            </div>
          )}

          {activeStage === 3 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
                3. Silero Voice Activity Detection & Chunking
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-1)', lineHeight: '20px' }}>
                Silero VAD analyzes 512-sample frames (32 ms) to detect active speech boundaries. For long recordings, 30-second sliding windows
                with 5-second overlaps guarantee that words uttered across boundary thresholds are not truncated.
              </p>
            </div>
          )}

          {activeStage === 4 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
                4. ICAO Telemetry Extraction & Normalization
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-1)', lineHeight: '20px' }}>
                Extracted transcripts are parsed with rule-based regular expressions to capture ICAO callsigns, runway clearances, assigned
                headings, flight levels, and VHF tower/departure contact frequencies without altering the original speech record.
              </p>
            </div>
          )}

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-1)',
            lineHeight: '18px'
          }}>
            <div>• Real-Time Factor (RTF): <strong>{(dataset?.speech_duration_seconds / (dataset?.processing_time_seconds || 1)).toFixed(1)}x</strong></div>
            <div>• Speech Duration: <strong>{duration.toFixed(1)}s</strong></div>
            <div>• Processing Compute: <strong>{dataset?.device ? dataset.device.toUpperCase() : 'CPU (AVX2-INT8)'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

