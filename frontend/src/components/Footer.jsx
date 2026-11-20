import React from 'react';

export default function Footer() {
    return (
        <footer style={{
            marginTop: '36px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-0)',
            padding: '24px 20px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--color-text-1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{
                maxWidth: '1440px',
                margin: '0 auto',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
            }}>
                {/* Brand & Specification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 6px #10b981'
                    }} />
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: '13px',
                        color: 'var(--color-text-0)',
                        letterSpacing: '0.04em'
                    }}>
                        AIRBANDSCRIBE
                    </span>
                    <span style={{ color: 'var(--color-text-2)' }}>//</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-2)', letterSpacing: '0.02em' }}>
                        VHF AM 118.000 – 136.975 MHz Acoustic Intelligence
                    </span>
                </div>

                {/* Prominent Author Copyright Notice */}
                <div style={{
                    textAlign: 'center',
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-surface-1)',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)'
                }}>
                    <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '12px',
                        color: 'var(--color-text-0)',
                        letterSpacing: '0.02em'
                    }}>
                        © 2026 AirbandScribe. Created & Engineered by{' '}
                        <span style={{
                            color: 'var(--color-pine-pri)',
                            fontWeight: 800,
                            letterSpacing: '0.05em'
                        }}>
                            DIVYANSHU SHEKHAR
                        </span>
                        . All Rights Reserved.
                    </span>
                </div>

                {/* Links, Open Source & Compliance Badges */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    color: 'var(--color-text-2)'
                }}>
                    <a
                        href="https://github.com/Divyanshu1305/AirbandScribe"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '4px 10px',
                            backgroundColor: 'var(--color-surface-1)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '3px',
                            color: 'var(--color-pine-pri)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>★</span> GitHub
                    </a>
                    <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '3px'
                    }}>
                        MIT LICENSE
                    </span>
                    <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '3px'
                    }}>
                        ICAO DOC 9432
                    </span>
                    <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '3px'
                    }}>
                        SILERO VAD
                    </span>
                </div>
            </div>
        </footer>
    );
}
