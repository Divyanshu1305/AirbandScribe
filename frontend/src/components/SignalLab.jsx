import React, { useState } from 'react';

export default function SignalLab() {
  const [selectedDurationSec, setSelectedDurationSec] = useState(30);

  // Exact DSP calculations for 16 kHz audio
  const sampleRate = 16000;
  const sampleIntervalMicroSec = (1 / sampleRate) * 1000000; // 62.5 µs
  const nyquistHz = sampleRate / 2; // 8,000 Hz
  const totalSamples = sampleRate * selectedDurationSec;
  const vadFrameSamples = 512;
  const vadFrameDurationMs = (vadFrameSamples / sampleRate) * 1000; // 32.0 ms
  const overlapSec = 5;
  const overlapSamples = sampleRate * overlapSec; // 80,000 samples

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Banner */}
      <div className="airband-card" style={{
        padding: '18px 24px',
        backgroundColor: 'var(--color-surface-0)',
        borderLeft: '4px solid var(--color-pine-pri)'
      }}>
        <h2 style={{
          margin: '0 0 6px 0',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text-0)'
        }}>
          Acoustic Signal Processing Science & Mathematical Parameters
        </h2>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: 'var(--color-text-1)',
          lineHeight: '20px'
        }}>
          This laboratory details the mathematical signal transformations executed by the AirbandScribe digital signal processing (DSP)
          and automatic speech recognition (ASR) architecture for aeronautical VHF radio communications.
        </p>
      </div>

      {/* 3 Core Mathematical Pillars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '16px'
      }}>
        {/* Pillar 1: Sampling & Nyquist */}
        <div className="airband-card" style={{ padding: '18px', backgroundColor: 'var(--color-surface-0)' }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--color-pine-pri)',
            marginBottom: '4px'
          }}>
            STAGE 01 // DISCRETE TIME DIGITIZATION
          </div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
            Nyquist-Shannon Sampling
          </h3>

          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '20px'
          }}>
            <div>• Target Sample Rate (f_s): <strong>16,000 Hz</strong></div>
            <div>• Sample Interval (T_s): <strong>{sampleIntervalMicroSec.toFixed(1)} µs</strong> (1/16,000s)</div>
            <div>• Nyquist Folding Limit (f_N): <strong>{nyquistHz.toLocaleString()} Hz</strong></div>
            <div>• Audio Bit Depth: <strong>16-bit Linear PCM</strong></div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-1)', lineHeight: '18px', margin: 0 }}>
            According to the Nyquist-Shannon sampling theorem, an analog signal with maximum frequency component f_max can be perfectly
            reconstructed only if sampled at f_s &gt; 2 · f_max. Standard aviation VHF AM channels allocate audio speech band up to 3,400 Hz;
            thus 16,000 Hz provides substantial oversampling margin without aliasing.
          </p>
        </div>

        {/* Pillar 2: Butterworth Bandpass Filter */}
        <div className="airband-card" style={{ padding: '18px', backgroundColor: 'var(--color-surface-0)' }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--color-pine-pri)',
            marginBottom: '4px'
          }}>
            STAGE 02 // FREQUENCY DOMAIN CONDITIONING
          </div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
            Butterworth 5th-Order IIR Voiceband Filter
          </h3>

          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '20px'
          }}>
            <div>• Passband Lower Cutoff: <strong>300 Hz</strong> (Highpass)</div>
            <div>• Passband Upper Cutoff: <strong>3,400 Hz</strong> (Lowpass)</div>
            <div>• Normalized Cutoffs: <strong>W_n = [0.0375, 0.4250]</strong></div>
            <div>• Implementation: <strong>scipy.signal.filtfilt (Zero-phase)</strong></div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-1)', lineHeight: '18px', margin: 0 }}>
            The 5th-order Butterworth digital filter provides maximally flat magnitude response in the passband (zero ripple) and roll-off of
            -30 dB per octave. Forward-backward filtering (filtfilt) cancels phase distortion, ensuring temporal alignment of phoneme onsets.
          </p>
        </div>

        {/* Pillar 3: VAD & Temporal Chunking */}
        <div className="airband-card" style={{ padding: '18px', backgroundColor: 'var(--color-surface-0)' }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--color-pine-pri)',
            marginBottom: '4px'
          }}>
            STAGE 03 // TEMPORAL CHUNKING & ALIGNMENT
          </div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
            Silero VAD & 5s Sliding Window
          </h3>

          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '20px'
          }}>
            <div>• VAD Frame Size: <strong>{vadFrameSamples} samples</strong> ({vadFrameDurationMs.toFixed(1)} ms)</div>
            <div>• Sliding Window Duration: <strong>30.0 seconds</strong> (480k samples)</div>
            <div>• Boundary Overlap: <strong>{overlapSec}.0 seconds</strong> ({overlapSamples.toLocaleString()} samples)</div>
            <div>• Boundary Deduplication: <strong>Longest Common Subsequence</strong></div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-1)', lineHeight: '18px', margin: 0 }}>
            Long airband transmissions are segmented into 30s overlapping windows. The 5-second overlap prevents word truncation across
            arbitrary chunk boundaries. The normalizer runs LCS alignment on overlapping tokens to merge segments into continuous transcripts.
          </p>
        </div>
      </div>

      {/* Interactive Window Calculator */}
      <div className="airband-card" style={{ padding: '20px', backgroundColor: 'var(--color-surface-0)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-0)' }}>
          Interactive Sample & Buffer Calculation
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-0)', display: 'block', marginBottom: '6px' }}>
            Adjust Transmission Buffer Duration: <strong>{selectedDurationSec} seconds</strong>
          </label>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={selectedDurationSec}
            onChange={(e) => setSelectedDurationSec(parseInt(e.target.value))}
            style={{ width: '100%', maxWidth: '500px', accentColor: 'var(--color-pine-pri)' }}
          />
        </div>

        {/* Calculated Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>TOTAL PCM SAMPLES</span>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-pine-pri)', marginTop: '4px' }}>
              {totalSamples.toLocaleString()}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-1)' }}>16,000 samples / sec × {selectedDurationSec}s</span>
          </div>

          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>VAD ANALYSIS FRAMES</span>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-0)', marginTop: '4px' }}>
              {Math.floor(totalSamples / vadFrameSamples).toLocaleString()}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-1)' }}>{vadFrameSamples} samples / frame (32 ms)</span>
          </div>

          <div style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>ESTIMATED RAW BUFFER SIZE</span>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-0)', marginTop: '4px' }}>
              {((totalSamples * 2) / 1024).toFixed(1)} KB
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-1)' }}>16-bit uncompressed mono PCM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

