import React, { useState, useEffect } from 'react';

export default function Header({
  activeTab,
  setActiveTab,
  onTogglePresentation,
  isPresentationMode,
  computeDevice = 'cpu'
}) {
  const [zuluTime, setZuluTime] = useState('');
  const [engineStatus, setEngineStatus] = useState({ online: true, version: '2.4.0', service: 'AirbandScribe' });

  // Live Zulu UTC Clock
  useEffect(() => {
    const updateZulu = () => {
      const now = new Date();
      setZuluTime(now.toISOString().slice(11, 19) + 'Z');
    };
    updateZulu();
    const interval = setInterval(updateZulu, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend engine status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setEngineStatus({
            online: data.status === 'online',
            version: data.version || '2.4.0',
            service: data.service || 'AirbandScribe Engine',
            hardware: data.hardware || {}
          });
        }
      } catch (e) {
        // Fallback gracefully
        setEngineStatus(prev => ({ ...prev, online: false }));
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      backgroundColor: 'var(--color-surface-0)',
      borderBottom: '1px solid var(--color-border)',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: 'var(--shadow-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-pine-pri)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          boxShadow: '0 1px 2px rgba(40,107,99,0.3)'
        }}>
          ✈
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-text-0)',
              letterSpacing: '-0.02em'
            }}>
              Airband<span style={{ color: 'var(--color-pine-pri)' }}>Scribe</span>
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-text-1)',
              border: '1px solid var(--color-border)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)'
            }}>
              v{engineStatus.version}
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            color: 'var(--color-text-1)',
            display: 'block',
            marginTop: '1px',
            letterSpacing: '0.01em'
          }}>
            Aeronautical VHF Speech Transcription & Signal Analysis
          </span>
        </div>
      </div>

      {/* Operational Workspace Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('workstation')}
          style={{
            background: activeTab === 'workstation' ? 'var(--color-pine-sub)' : 'transparent',
            color: activeTab === 'workstation' ? 'var(--color-pine-pri)' : 'var(--color-text-1)',
            border: activeTab === 'workstation' ? '1px solid var(--color-pine-border)' : '1px solid transparent',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: activeTab === 'workstation' ? 600 : 500,
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Workstation
        </button>
        <button
          onClick={() => setActiveTab('recordings')}
          style={{
            background: activeTab === 'recordings' ? 'var(--color-pine-sub)' : 'transparent',
            color: activeTab === 'recordings' ? 'var(--color-pine-pri)' : 'var(--color-text-1)',
            border: activeTab === 'recordings' ? '1px solid var(--color-pine-border)' : '1px solid transparent',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: activeTab === 'recordings' ? 600 : 500,
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Recordings
        </button>
        <button
          onClick={() => setActiveTab('signallab')}
          style={{
            background: activeTab === 'signallab' ? 'var(--color-pine-sub)' : 'transparent',
            color: activeTab === 'signallab' ? 'var(--color-pine-pri)' : 'var(--color-text-1)',
            border: activeTab === 'signallab' ? '1px solid var(--color-pine-border)' : '1px solid transparent',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: activeTab === 'signallab' ? 600 : 500,
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Signal Lab
        </button>
      </nav>

      {/* Real Runtime Indicators & Presentation Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Zulu Clock */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          padding: '2px 8px',
          borderRight: '1px solid var(--color-border)'
        }}>
          <span style={{ fontSize: '9px', color: 'var(--color-text-2)', fontFamily: 'var(--font-mono)' }}>ZULU UTC</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-0)', fontFamily: 'var(--font-mono)' }}>
            {zuluTime || '00:00:00Z'}
          </span>
        </div>

        {/* Engine Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: engineStatus.online ? 'var(--color-signal-grn)' : 'var(--color-danger)'
          }} />
          <span style={{ color: 'var(--color-text-1)' }}>
            {engineStatus.online ? 'ENGINE READY' : 'ENGINE OFFLINE'}
          </span>
        </div>

        {/* Compute Device */}
        <div style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: computeDevice === 'cuda' ? 'var(--color-pine-pri)' : 'var(--color-text-1)'
        }}>
          {computeDevice === 'cuda' ? 'GPU (CUDA)' : 'CPU (AVX2-INT8)'}
        </div>

        {/* Presentation Mode Button */}
        <button
          onClick={onTogglePresentation}
          title="Toggle Full-Screen Academic / Research Presentation Mode"
          style={{
            backgroundColor: isPresentationMode ? 'var(--color-amber-sub)' : 'var(--color-surface-0)',
            color: isPresentationMode ? 'var(--color-amber-pri)' : 'var(--color-text-0)',
            border: isPresentationMode ? '1px solid var(--color-amber-pri)' : '1px solid var(--color-border)',
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>{isPresentationMode ? '🗗 Exit Presentation' : '🗖 Presentation Mode'}</span>
        </button>
      </div>
    </header>
  );
}

