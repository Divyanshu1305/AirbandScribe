import React, { useState, useRef } from 'react';

export default function IngestionDeck({
  file,
  setFile,
  applyDenoise,
  setApplyDenoise,
  denoiseCoeff,
  setDenoiseCoeff,
  computeDevice,
  setComputeDevice,
  selectedModel,
  setSelectedModel,
  isProcessing,
  processStatus,
  processError,
  onSubmit
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <section className="airband-card" style={{ padding: '16px', backgroundColor: 'var(--color-surface-0)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-0)',
            letterSpacing: '0.04em'
          }}>
            VHF TRANSMISSION INGESTION & DSP PIPELINE
          </span>
        </div>
        {isProcessing && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--color-amber-pri)',
            backgroundColor: 'var(--color-amber-sub)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-amber-pri)'
          }}>
            ● PIPELINE ACTIVE
          </span>
        )}
      </div>

      <form onSubmit={onSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '14px'
        }}>
          {/* File Upload Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${isDragOver ? 'var(--color-pine-pri)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              textAlign: 'center',
              backgroundColor: isDragOver ? 'var(--color-pine-sub)' : 'var(--color-surface-1)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '80px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-pine-pri)',
                  display: 'block'
                }}>
                  📄 {file.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-1)', marginTop: '2px', display: 'block' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for ASR Processing
                </span>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-0)' }}>
                  Select or Drop Aeronautical Audio Recording
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-1)', display: 'block', marginTop: '2px' }}>
                  Supports 16 kHz VHF WAV, MP3, M4A Airband Transmissions
                </span>
              </div>
            )}
          </div>

          {/* Configuration Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Filter Checkboxes */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: 'var(--color-surface-1)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  style={{ accentColor: 'var(--color-pine-pri)' }}
                />
                <span style={{ fontWeight: 500 }}>300 Hz – 3,400 Hz Butterworth IIR Voiceband</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={applyDenoise}
                  onChange={(e) => setApplyDenoise(e.target.checked)}
                  style={{ accentColor: 'var(--color-pine-pri)' }}
                />
                <span style={{ fontWeight: 500 }}>Spectral Noise Gate ({Math.round(denoiseCoeff * 100)}% Gating)</span>
              </label>
            </div>

            {/* Hardware & Model Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)', display: 'block', marginBottom: '2px' }}>
                  COMPUTE BACKEND
                </label>
                <select
                  value={computeDevice}
                  onChange={(e) => setComputeDevice(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                >
                  <option value="cpu">CPU (AVX2-int8)</option>
                  <option value="cuda">GPU (CUDA-fp16)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)', display: 'block', marginBottom: '2px' }}>
                  ASR MODEL
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                >
                  <option value="base.en">Faster-Whisper (base.en)</option>
                  <option value="small.en">Faster-Whisper (small.en)</option>
                  <option value="medium.en">Faster-Whisper (medium.en)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button & Status Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="submit"
              disabled={!file || isProcessing}
              className="btn-action-primary"
            >
              {isProcessing ? '⏳ PROCESSING TRANSMISSION...' : '▶ TRANSCRIBE & EXTRACT TELEMETRY'}
            </button>
          </div>

          {/* Truthful Status or Error Message */}
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            {processError && (
              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                ✕ Error: {processError}
              </span>
            )}
            {!processError && processStatus && (
              <span style={{ color: 'var(--color-pine-pri)', fontWeight: 500 }}>
                {processStatus}
              </span>
            )}
            {!processError && !processStatus && (
              <span style={{ color: 'var(--color-text-2)' }}>
                System Ready. Awaiting audio upload.
              </span>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

