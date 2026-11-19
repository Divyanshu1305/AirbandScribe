import React, { useState } from 'react';

function fmtDuration(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FlightLogbook({
  historyList = [],
  loadedRecordId = null,
  onLoadRecord,
  onDeleteRecord,
  onRefresh,
  isLoading = false
}) {
  const [recordToDelete, setRecordToDelete] = useState(null);

  const confirmDelete = () => {
    if (recordToDelete) {
      onDeleteRecord(recordToDelete.id);
      setRecordToDelete(null);
    }
  };

  return (
    <section className="airband-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
      backgroundColor: 'var(--color-surface-0)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface-1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-0)',
            letterSpacing: '0.04em'
          }}>
            FLIGHT RECORDER LOGBOOK
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--color-text-1)',
            backgroundColor: 'var(--color-surface-0)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}>
            {historyList.length} Sessions
          </span>
        </div>

        <button
          onClick={onRefresh}
          className="btn-action-secondary"
          disabled={isLoading}
          style={{ fontSize: '11px', padding: '3px 8px' }}
        >
          {isLoading ? '↻ Syncing...' : '↻ Sync Log'}
        </button>
      </div>

      {/* Logbook Items Table / List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {historyList.length === 0 ? (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            color: 'var(--color-text-2)',
            fontSize: '12px'
          }}>
            {isLoading ? 'Querying flight recording database...' : 'No historical flight sessions recorded.'}
          </div>
        ) : (
          historyList.map((item) => {
            const isLoaded = loadedRecordId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onLoadRecord(item.id)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border-sub)',
                  backgroundColor: isLoaded ? 'var(--color-pine-sub)' : 'transparent',
                  borderLeft: isLoaded ? '3px solid var(--color-pine-pri)' : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Filename and Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color: isLoaded ? 'var(--color-pine-pri)' : 'var(--color-text-0)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.filename}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-1)',
                    marginTop: '2px'
                  }}>
                    <span>{fmtDuration(item.speech_duration_seconds)}</span>
                    <span>•</span>
                    <span>{item.device ? item.device.toUpperCase() : 'CPU'}</span>
                    <span>•</span>
                    <span>{item.created_at ? item.created_at.slice(0, 16) : item.timestamp}</span>
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--color-signal-grn)',
                    backgroundColor: 'rgba(75, 153, 126, 0.12)',
                    border: '1px solid rgba(75, 153, 126, 0.3)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    ✓ READY
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordToDelete(item);
                    }}
                    title="Delete logbook entry"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-danger)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '2px 6px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑 DEL
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(24, 39, 42, 0.65)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="airband-card" style={{
            width: '90%',
            maxWidth: '440px',
            padding: '20px',
            backgroundColor: 'var(--color-surface-0)',
            boxShadow: 'var(--shadow-modal)'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-text-0)'
            }}>
              Confirm Logbook Entry Deletion
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              lineHeight: '19px',
              color: 'var(--color-text-1)'
            }}>
              Are you sure you want to permanently delete recording <strong style={{ color: 'var(--color-text-0)' }}>#{recordToDelete.id} ({recordToDelete.filename})</strong>?
              This will remove the session from SQLite persistence and delete intermediate audio files.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setRecordToDelete(null)}
                className="btn-action-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  backgroundColor: 'var(--color-danger)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: 'pointer'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

