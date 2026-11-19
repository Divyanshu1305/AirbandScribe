import React from 'react';

export default function TelemetryMatrix({ entities = {}, totalTransmissions = 0, speedup = '1.0' }) {
  const {
    callsigns = [],
    runways = [],
    altitudes = [],
    headings = [],
    freqs = []
  } = entities;

  return (
    <section className="airband-card" style={{ padding: '16px', backgroundColor: 'var(--color-surface-0)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-0)',
          letterSpacing: '0.04em'
        }}>
          FLIGHT TELEMETRY & ICAO PHRASEOLOGY INTELLIGENCE
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-1)',
            backgroundColor: 'var(--color-surface-1)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}>
            RTF: <strong>{speedup}x</strong>
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-pine-pri)',
            backgroundColor: 'var(--color-pine-sub)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-pine-border)'
          }}>
            {totalTransmissions} Transmissions
          </span>
        </div>
      </div>

      {/* 4-Quadrant Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        {/* Callsigns */}
        <div style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
              CALLSIGNS ({callsigns.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
            {callsigns.length > 0 ? (
              callsigns.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    backgroundColor: 'var(--tok-callsign-bg)',
                    color: 'var(--tok-callsign-color)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid #C4DCD7'
                  }}
                >
                  {c}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--color-text-2)', fontStyle: 'italic' }}>
                None detected
              </span>
            )}
          </div>
        </div>

        {/* Runways */}
        <div style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
              RUNWAYS ({runways.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
            {runways.length > 0 ? (
              runways.map((r, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    backgroundColor: 'var(--tok-runway-bg)',
                    color: 'var(--tok-runway-color)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid #CADAE8'
                  }}
                >
                  {r}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--color-text-2)', fontStyle: 'italic' }}>
                None detected
              </span>
            )}
          </div>
        </div>

        {/* Headings */}
        <div style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
              HEADINGS ({headings.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
            {headings.length > 0 ? (
              headings.map((h, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    backgroundColor: 'var(--tok-hdg-bg)',
                    color: 'var(--tok-hdg-color)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid #EED7C8'
                  }}
                >
                  {h}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--color-text-2)', fontStyle: 'italic' }}>
                None detected
              </span>
            )}
          </div>
        </div>

        {/* Altitudes & Frequencies */}
        <div style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
              ALT & FREQ ({altitudes.length + freqs.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
            {altitudes.length > 0 || freqs.length > 0 ? (
              <>
                {altitudes.map((a, i) => (
                  <span
                    key={`alt-${i}`}
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      backgroundColor: 'var(--tok-alt-bg)',
                      color: 'var(--tok-alt-color)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid #DCD5EA'
                    }}
                  >
                    {a}
                  </span>
                ))}
                {freqs.map((f, i) => (
                  <span
                    key={`frq-${i}`}
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      backgroundColor: 'var(--tok-freq-bg)',
                      color: 'var(--tok-freq-color)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid #EED5E0'
                    }}
                  >
                    {f}
                  </span>
                ))}
              </>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--color-text-2)', fontStyle: 'italic' }}>
                None detected
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

