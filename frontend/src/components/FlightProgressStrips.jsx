import React, { useRef, useEffect } from 'react';

function fmtZulu(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export default function FlightProgressStrips({
  segments = [],
  activeSegIdx = -1,
  onSeekToSegment,
  searchFilter = '',
  setSearchFilter,
  onExportSRT,
  onExportJSON,
  onExportTXT,
  onCopyText,
  tagAviationText
}) {
  const containerRef = useRef(null);
  const stripRefs = useRef({});

  // Filtered segments
  const filteredSegments = segments.filter(seg => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (seg.text || '').toLowerCase().includes(q);
  });

  // Precision container-relative auto-scroll
  useEffect(() => {
    if (activeSegIdx < 0 || !containerRef.current) return;
    const container = containerRef.current;
    const activeElem = stripRefs.current[activeSegIdx];
    if (!activeElem) return;

    const cRect = container.getBoundingClientRect();
    const eRect = activeElem.getBoundingClientRect();

    const isAbove = eRect.top < cRect.top + 20;
    const isBelow = eRect.bottom > cRect.bottom - 20;

    if (isAbove || isBelow) {
      const currentScroll = container.scrollTop;
      const elemRelTop = eRect.top - cRect.top;
      const targetScroll = currentScroll + elemRelTop - (container.clientHeight / 2) + (activeElem.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [activeSegIdx]);

  return (
    <section className="airband-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
      backgroundColor: 'var(--color-surface-0)',
      overflow: 'hidden'
    }}>
      {/* Header & Filter Controls */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        backgroundColor: 'var(--color-surface-1)'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-0)',
            letterSpacing: '0.04em'
          }}>
            FLIGHT PROGRESS STRIPS
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--color-pine-pri)',
            backgroundColor: 'var(--color-pine-sub)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)'
          }}>
            {filteredSegments.length} / {segments.length}
          </span>
        </div>

        {/* Search & Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Search Filter */}
          <input
            type="text"
            placeholder="Filter callsign / runway..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="form-input"
            style={{ width: '160px', fontSize: '11px', padding: '3px 8px' }}
          />

          {/* Export Buttons */}
          <button
            onClick={onExportSRT}
            className="btn-action-secondary"
            title="Export as SubRip (.SRT) Subtitles"
            style={{ fontSize: '10px', padding: '3px 7px', fontFamily: 'var(--font-mono)' }}
          >
            .SRT
          </button>
          <button
            onClick={onExportJSON}
            className="btn-action-secondary"
            title="Export as JSON Telemetry"
            style={{ fontSize: '10px', padding: '3px 7px', fontFamily: 'var(--font-mono)' }}
          >
            .JSON
          </button>
          <button
            onClick={onExportTXT}
            className="btn-action-secondary"
            title="Export as Plaintext Dispatch"
            style={{ fontSize: '10px', padding: '3px 7px', fontFamily: 'var(--font-mono)' }}
          >
            .TXT
          </button>
        </div>
      </div>

      {/* Progress Strip Scroll Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0'
        }}
      >
        {filteredSegments.length === 0 ? (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            color: 'var(--color-text-2)',
            fontSize: '12px'
          }}>
            No transmission segments match current filter criteria.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isCurrent = activeSegIdx === idx;
            const durationSec = (seg.end - seg.start).toFixed(2);
            const tagged = tagAviationText ? tagAviationText(seg.text) : [{ t: seg.text, cls: null }];

            return (
              <div
                key={idx}
                ref={(el) => (stripRefs.current[idx] = el)}
                onClick={() => onSeekToSegment(seg.start)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border-sub)',
                  backgroundColor: isCurrent ? 'var(--color-pine-sub)' : 'transparent',
                  borderLeft: isCurrent ? '3px solid var(--color-pine-pri)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Timestamp & Duration */}
                <div style={{
                  minWidth: '82px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: '16px'
                }}>
                  <div style={{ fontWeight: 700, color: isCurrent ? 'var(--color-pine-pri)' : 'var(--color-text-0)' }}>
                    {fmtZulu(seg.start)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-2)' }}>
                    {durationSec}s
                  </div>
                </div>

                {/* Strip Transcript Content */}
                <div style={{
                  flex: 1,
                  fontSize: '13px',
                  lineHeight: '19px',
                  color: 'var(--color-text-0)'
                }}>
                  {tagged.map((token, tIdx) => {
                    if (!token.cls) {
                      return <span key={tIdx}>{token.t}</span>;
                    }
                    return (
                      <span
                        key={tIdx}
                        className={token.cls}
                        style={{
                          fontWeight: 600,
                          borderRadius: '2px',
                          padding: '0 2px'
                        }}
                      >
                        {token.t}
                      </span>
                    );
                  })}
                </div>

                {/* Copy Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyText(seg.text);
                  }}
                  title="Copy transmission text"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-1)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    opacity: 0.8
                  }}
                >
                  CPY
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

