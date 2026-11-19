import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Header from './Header.jsx';
import WaveformScope from './WaveformScope.jsx';
import IngestionDeck from './IngestionDeck.jsx';
import TelemetryMatrix from './TelemetryMatrix.jsx';
import FlightProgressStrips from './FlightProgressStrips.jsx';
import FlightLogbook from './FlightLogbook.jsx';
import SignalLab from './SignalLab.jsx';
import PresentationMode from './PresentationMode.jsx';

// ---------------------------------------------------------------------------
// AirbandScribe // Aeronautical VHF Telemetry Benchmark Reference Record
// ---------------------------------------------------------------------------
const BENCHMARK_FLIGHT_RECORD = {
    id: 1,
    filename: 'sample_atc.wav',
    language: 'en',
    processing_time_seconds: 14.46,
    speech_duration_seconds: 13.02,
    vad_enabled: true,
    noise_removal_enabled: true,
    device: 'cpu',
    timestamp: '20261119_001455',
    text: "United 426, turn left heading 270, descend and maintain 3,000 feet, cleared ILS runway 27 approach, contact tower on 119.1.",
    segments: [
        { start: 0.00, end: 3.20, text: "United 426, turn left heading 270." },
        { start: 3.20, end: 7.15, text: "Descend and maintain 3000 feet, cleared ILS runway 27 approach." },
        { start: 7.15, end: 11.40, text: "Contact tower on 119.1, good day." },
        { start: 11.40, end: 13.02, text: "119.1, United 426." }
    ],
    filtered_full_path_rel: "output/filtered_full_20261119_001455.wav",
    denoised_full_path_rel: "output/denoised_full_20261119_001455.wav"
};

// ---------------------------------------------------------------------------
// Airband ATC Phraseology Lexicon & Tokenizer
// ---------------------------------------------------------------------------
const ATC_PATTERNS = [
    { re: /\b(cleared|maintain|contact|descend|climb|turn left|turn right|hold short|reduce speed|intercept|squawk|radar contact|established|approved|roger)\b/gi, cls: 'tok-verb' },
    { re: /\b(runway\s\d{1,2}[LRC]?|RWY\s\d{1,2}[LRC]?)\b/gi, cls: 'tok-runway' },
    { re: /\b(FL\d{2,3}|flight level \d{2,3}|\d{1,2},?\d{3}\s?feet|\d{3,4}\s?ft)\b/gi, cls: 'tok-alt' },
    { re: /\b(heading\s\d{3}|HDG\s\d{3})\b/gi, cls: 'tok-heading' },
    { re: /\b(ils|dme|localizer|qnh|vfr|ifr|vor|tacan|rnav)\b/gi, cls: 'tok-nav' },
    { re: /\b(1\d{2}\.\d{1,3}\s?mhz|1\d{2}\.\d{1,3}|2\d{2}\.\d{1,3})\b/gi, cls: 'tok-freq' },
    { re: /\b(United|American|Delta|Speedbird|FedEx|Air Portugal|Southwest|Skywest|Cessna|Boeing|Airbus|Echo Tower|National Tower|Russian Tower|Marine|VPOTUS)\s?\d{0,4}\s?(heavy)?\b/gi, cls: 'tok-callsign' }
];

function tagAviationText(text) {
    if (!text) return [];
    const marks = new Array(text.length).fill(null);
    ATC_PATTERNS.forEach(({ re, cls }) => {
        let m;
        const rx = new RegExp(re.source, re.flags);
        while ((m = rx.exec(text)) !== null) {
            if (m[0].length === 0) { rx.lastIndex++; continue; }
            let clash = false;
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (marks[i]) { clash = true; break; }
            }
            if (!clash) {
                for (let i = m.index; i < m.index + m[0].length; i++) {
                    marks[i] = cls;
                }
            }
        }
    });

    const nodes = [];
    let i = 0;
    while (i < text.length) {
        if (!marks[i]) {
            let j = i;
            while (j < text.length && !marks[j]) j++;
            nodes.push({ t: text.slice(i, j), cls: null });
            i = j;
        } else {
            const cls = marks[i];
            let j = i;
            while (j < text.length && marks[j] === cls) j++;
            nodes.push({ t: text.slice(i, j), cls });
            i = j;
        }
    }
    return nodes;
}

function fmtZulu(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export default function AirbandScribeConsole() {
    // Dataset & Playback States
    const [dataset, setDataset] = useState(BENCHMARK_FLIGHT_RECORD);
    const [playhead, setPlayhead] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSegIdx, setActiveSegIdx] = useState(-1);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [audioChannel, setAudioChannel] = useState('denoised'); // 'denoised' | 'filtered'
    const [loopSegment, setLoopSegment] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    // URL Hash Support for Deep-Linking
    const initialHash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
    const [activeTab, setActiveTab] = useState(
        initialHash.includes('signallab') ? 'signallab' :
        initialHash.includes('recordings') ? 'recordings' : 'workstation'
    );
    const [isPresentationMode, setIsPresentationMode] = useState(initialHash.includes('presentation'));

    // Sync Hash with View
    useEffect(() => {
        if (isPresentationMode) {
            window.location.hash = 'presentation';
        } else if (activeTab === 'signallab') {
            window.location.hash = 'signallab';
        } else if (activeTab === 'recordings') {
            window.location.hash = 'recordings';
        } else {
            window.location.hash = '';
        }
    }, [activeTab, isPresentationMode]);

    // History States
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [loadedRecordId, setLoadedRecordId] = useState(dataset.id || null);

    // Ingestion & Job States
    const [file, setFile] = useState(null);
    const [applyDenoise, setApplyDenoise] = useState(true);
    const [denoiseCoeff, setDenoiseCoeff] = useState(0.75);
    const [computeDevice, setComputeDevice] = useState('cpu');
    const [selectedModel, setSelectedModel] = useState('base.en');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [processError, setProcessError] = useState(null);

    // Audio Player Ref
    const audioRef = useRef(null);
    if (!audioRef.current) {
        audioRef.current = new Audio();
    }

    // Audio Source Resolution
    const totalDuration = dataset.speech_duration_seconds || (dataset.segments && dataset.segments.length > 0 ? dataset.segments[dataset.segments.length - 1].end : 1);

    const currentAudioUrl = useMemo(() => {
        const relPath = audioChannel === 'denoised' ? dataset.denoised_full_path_rel : dataset.filtered_full_path_rel;
        if (relPath) return `/${relPath}`;
        return '';
    }, [dataset, audioChannel]);

    // Load History from backend SQLite
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/transcriptions?limit=20');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const list = data.transcriptions || [];
            setHistoryList(list);

            // If initial dataset has id and list has records, sync to first record if not loaded
            if (list.length > 0 && dataset.filename === 'sample_atc.wav' && list[0].id !== 1) {
                // optionally load latest record
            }
        } catch (err) {
            console.warn("History fetch notice:", err.message);
        } finally {
            setHistoryLoading(false);
        }
    }, [dataset.filename]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Load Specific Historical Session
    const loadHistoricalRecord = async (id) => {
        try {
            const res = await fetch(`/transcriptions/${id}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const detail = await res.json();
            if (detail && detail.segments) {
                if (audioRef.current) audioRef.current.pause();
                setIsPlaying(false);
                setDataset(detail);
                setLoadedRecordId(detail.id);
                setPlayhead(0);
                setProcessStatus(`Loaded Record #${detail.id}: ${detail.filename}`);
            }
        } catch (err) {
            console.error("Failed to load historical record:", err);
        }
    };

    // Delete Record with confirmation
    const deleteHistoricalRecord = async (id) => {
        try {
            await fetch(`/transcriptions/${id}`, { method: 'DELETE' });
            loadHistory();
            if (loadedRecordId === id) {
                setLoadedRecordId(null);
            }
            setProcessStatus(`Record #${id} deleted.`);
        } catch (err) {
            console.error("Delete failed:", err);
            setProcessError("Failed to delete record.");
        }
    };

    // Derived speedup
    const speedup = dataset.processing_time_seconds
        ? (dataset.speech_duration_seconds / dataset.processing_time_seconds).toFixed(1)
        : '1.0';

    // Extracted ICAO Entities
    const extractedEntities = useMemo(() => {
        const text = dataset.text || (dataset.segments || []).map(s => s.text).join(' ');
        const callsigns = Array.from(new Set(text.match(ATC_PATTERNS[6].re) || []));
        const runways = Array.from(new Set(text.match(ATC_PATTERNS[1].re) || []));
        const altitudes = Array.from(new Set(text.match(ATC_PATTERNS[2].re) || []));
        const headings = Array.from(new Set(text.match(ATC_PATTERNS[3].re) || []));
        const freqs = Array.from(new Set(text.match(ATC_PATTERNS[5].re) || []));
        return { callsigns, runways, altitudes, headings, freqs };
    }, [dataset]);

    // Active Segment Tracking
    useEffect(() => {
        if (!dataset.segments || dataset.segments.length === 0) return;
        let idx = dataset.segments.findIndex(s => playhead >= s.start && playhead <= s.end);
        if (idx === -1) {
            idx = dataset.segments.reduce((bestIdx, s, currIdx) => {
                if (s.start <= playhead) return currIdx;
                return bestIdx;
            }, -1);
        }
        setActiveSegIdx(idx);

        // Segment Loop
        if (loopSegment && idx >= 0) {
            const seg = dataset.segments[idx];
            if (playhead >= seg.end - 0.05) {
                seekTo(seg.start);
            }
        }
    }, [playhead, dataset.segments, loopSegment]);

    // Audio Playback & Seeking
    const seekTo = (seconds) => {
        const clamped = Math.max(0, Math.min(seconds, totalDuration));
        setPlayhead(clamped);
        if (audioRef.current && audioRef.current.src) {
            audioRef.current.currentTime = clamped;
        }
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (currentAudioUrl && (!audio.src || !audio.src.includes(currentAudioUrl))) {
            audio.src = currentAudioUrl;
            audio.load();
            audio.currentTime = playhead;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.playbackRate = playbackRate;
            audio.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                    // Fallback playhead simulation if audio file not reachable
                    setIsPlaying(true);
                });
        }
    };

    // Smooth Playhead Update Loop
    useEffect(() => {
        let lastTime = performance.now();
        let frameId;

        const updatePlayhead = (now) => {
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            if (isPlaying) {
                const audio = audioRef.current;
                if (audio && audio.src && !audio.paused && !isNaN(audio.currentTime)) {
                    setPlayhead(audio.currentTime);
                    if (audio.ended || audio.currentTime >= totalDuration) {
                        setIsPlaying(false);
                    }
                } else {
                    setPlayhead((prev) => {
                        const next = prev + delta * playbackRate;
                        if (next >= totalDuration) {
                            setIsPlaying(false);
                            return totalDuration;
                        }
                        return next;
                    });
                }
            }

            frameId = requestAnimationFrame(updatePlayhead);
        };

        frameId = requestAnimationFrame(updatePlayhead);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, totalDuration, playbackRate]);

    // Upload & Transcribe Form Submission
    const handleUploadTranscribe = async (e) => {
        e.preventDefault();
        if (!file) return;

        setIsProcessing(true);
        setProcessError(null);
        setProcessStatus('Ingesting VHF audio stream into DSP pipeline...');

        const fd = new FormData();
        fd.append('file', file);
        fd.append('apply_noise_removal', applyDenoise.toString());
        fd.append('noise_reduction', denoiseCoeff.toString());
        fd.append('language', 'en');
        fd.append('save_intermediate', 'true');
        fd.append('device', computeDevice);

        try {
            setProcessStatus('Applying Butterworth bandpass (300-3400Hz) & spectral noise gate...');
            const res = await fetch('/transcribe', { method: 'POST', body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Server error: ${res.status}`);
            }

            setProcessStatus('Executing Faster-Whisper ASR inference & ICAO normalization...');
            const data = await res.json();
            if (data && data.segments) {
                if (!data.text) data.text = data.segments.map(s => s.text).join(' ');
                setDataset(data);
                setLoadedRecordId(data.id || null);
                setPlayhead(0);
                setProcessStatus(`Transcription complete: ${data.segments.length} transmissions decoded.`);
                loadHistory();
            }
        } catch (err) {
            setProcessError(err.message);
            setProcessStatus('Transcription failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Export Handlers
    const exportAsSRT = () => {
        if (!dataset.segments) return;
        let srt = '';
        dataset.segments.forEach((s, idx) => {
            const startH = Math.floor(s.start / 3600);
            const startM = Math.floor((s.start % 3600) / 60);
            const startS = Math.floor(s.start % 60);
            const startMs = Math.floor((s.start % 1) * 1000);

            const endH = Math.floor(s.end / 3600);
            const endM = Math.floor((s.end % 3600) / 60);
            const endS = Math.floor(s.end % 60);
            const endMs = Math.floor((s.end % 1) * 1000);

            const sFmt = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:${String(startS).padStart(2,'0')},${String(startMs).padStart(3,'0')}`;
            const eFmt = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:${String(endS).padStart(2,'0')},${String(endMs).padStart(3,'0')}`;

            srt += `${idx + 1}\n${sFmt} --> ${eFmt}\n${s.text}\n\n`;
        });
        downloadBlob(srt, `${dataset.filename || 'airband'}_transcript.srt`, 'text/plain');
    };

    const exportAsJSON = () => {
        const payload = JSON.stringify(dataset, null, 2);
        downloadBlob(payload, `${dataset.filename || 'airband'}_telemetry.json`, 'application/json');
    };

    const exportAsTXT = () => {
        const header = `AIRBANDSCRIBE // AERONAUTICAL DISPATCH TRANSCRIPT\nRECORD: ${dataset.filename}\nDURATION: ${dataset.speech_duration_seconds}s\nZULU RUN: ${dataset.timestamp}\n--------------------------------------------------\n\n`;
        const body = (dataset.segments || []).map(s => `[${fmtZulu(s.start)} -> ${fmtZulu(s.end)}] ${s.text}`).join('\n');
        downloadBlob(header + body, `${dataset.filename || 'airband'}_dispatch.txt`, 'text/plain');
    };

    const downloadBlob = (content, filename, mime) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setProcessStatus('Copied text to clipboard.');
        setTimeout(() => setProcessStatus(''), 2500);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['input', 'textarea', 'select'].includes(e.target.tagName?.toLowerCase())) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seekTo(playhead - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekTo(playhead + 5);
                    break;
                case 'KeyA':
                    e.preventDefault();
                    setAudioChannel(prev => prev === 'denoised' ? 'filtered' : 'denoised');
                    break;
                case 'KeyL':
                    e.preventDefault();
                    setLoopSegment(prev => !prev);
                    break;
                case 'Escape':
                    if (isPresentationMode) {
                        setIsPresentationMode(false);
                    }
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playhead, isPlaying, audioChannel, loopSegment, isPresentationMode]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-app-bg)'
        }}>
            {/* Unified Application Header */}
            <Header
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isPresentationMode={isPresentationMode}
                onTogglePresentation={() => setIsPresentationMode(prev => !prev)}
                computeDevice={computeDevice}
            />

            {/* Main Application Body */}
            <main style={{
                flex: 1,
                padding: '16px 20px',
                maxWidth: '1600px',
                margin: '0 auto',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {activeTab === 'workstation' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Top Row: Ingestion Pipeline & Telemetry Matrix */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                            gap: '14px'
                        }}>
                            <IngestionDeck
                                file={file}
                                setFile={setFile}
                                applyDenoise={applyDenoise}
                                setApplyDenoise={setApplyDenoise}
                                denoiseCoeff={denoiseCoeff}
                                setDenoiseCoeff={setDenoiseCoeff}
                                computeDevice={computeDevice}
                                setComputeDevice={setComputeDevice}
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                isProcessing={isProcessing}
                                processStatus={processStatus}
                                processError={processError}
                                onSubmit={handleUploadTranscribe}
                            />

                            <TelemetryMatrix
                                entities={extractedEntities}
                                totalTransmissions={dataset.segments?.length || 0}
                                speedup={speedup}
                            />
                        </div>

                        {/* Middle Row: True Audio Waveform & Speech Activity Scope */}
                        <WaveformScope
                            audioUrl={currentAudioUrl}
                            audioBlob={file}
                            segments={dataset.segments || []}
                            duration={totalDuration}
                            playhead={playhead}
                            isPlaying={isPlaying}
                            onSeek={seekTo}
                            onTogglePlay={togglePlay}
                            audioChannel={audioChannel}
                            onToggleAudioChannel={(ch) => setAudioChannel(ch)}
                            playbackRate={playbackRate}
                            onChangePlaybackRate={(r) => setPlaybackRate(r)}
                            loopSegment={loopSegment}
                            onToggleLoop={() => setLoopSegment(prev => !prev)}
                            activeSegIdx={activeSegIdx}
                        />

                        {/* Bottom Row: Flight Progress Strips & Flight Recorder Logbook */}
                        <div className="grid-2col-responsive">
                            <FlightProgressStrips
                                segments={dataset.segments || []}
                                activeSegIdx={activeSegIdx}
                                onSeekToSegment={seekTo}
                                searchFilter={searchFilter}
                                setSearchFilter={setSearchFilter}
                                onExportSRT={exportAsSRT}
                                onExportJSON={exportAsJSON}
                                onExportTXT={exportAsTXT}
                                onCopyText={copyToClipboard}
                                tagAviationText={tagAviationText}
                            />

                            <FlightLogbook
                                historyList={historyList}
                                loadedRecordId={loadedRecordId}
                                onLoadRecord={loadHistoricalRecord}
                                onDeleteRecord={deleteHistoricalRecord}
                                onRefresh={loadHistory}
                                isLoading={historyLoading}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'recordings' && (
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <FlightLogbook
                            historyList={historyList}
                            loadedRecordId={loadedRecordId}
                            onLoadRecord={(id) => {
                                loadHistoricalRecord(id);
                                setActiveTab('workstation');
                            }}
                            onDeleteRecord={deleteHistoricalRecord}
                            onRefresh={loadHistory}
                            isLoading={historyLoading}
                        />
                    </div>
                )}

                {activeTab === 'signallab' && (
                    <SignalLab />
                )}
            </main>

            {/* Presentation Mode Overlay */}
            {isPresentationMode && (
                <PresentationMode
                    dataset={dataset}
                    onClose={() => setIsPresentationMode(false)}
                    playhead={playhead}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    onSeek={seekTo}
                    activeSegIdx={activeSegIdx}
                    onSeekToSegment={seekTo}
                />
            )}
        </div>
    );
}
