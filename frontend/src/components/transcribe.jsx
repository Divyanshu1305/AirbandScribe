import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

// ---------------------------------------------------------------------------
// AirbandScribe // Aeronautical VHF Telemetry Mock Dataset
// ---------------------------------------------------------------------------
const MOCK_FLIGHT_RECORD = {
    id: 1,
    filename: 'KORD_APP_133.000_ARRIVALS.wav',
    language: 'en',
    processing_time_seconds: 14.82,
    speech_duration_seconds: 70.87,
    vad_enabled: true,
    noise_removal_enabled: true,
    device: 'cpu',
    timestamp: '20261119_014022',
    segments: [
        { start: 2.29, end: 4.97, text: "United 182 heavy, radar contact, descend and maintain 3000 feet." },
        { start: 4.97, end: 8.12, text: "Chicago approach, United 182 heavy, descending 3000 feet, heading 270." },
        { start: 8.12, end: 11.45, text: "United 182 heavy, turn left heading 240, cleared ILS runway 27L approach." },
        { start: 11.45, end: 14.30, text: "Cleared ILS runway 27L, maintain 170 knots to RAPET, United 182." },
        { start: 14.30, end: 18.05, text: "Air Portugal 322 heavy, reduce speed to 160 knots, follow United heavy." },
        { start: 18.05, end: 21.80, text: "Slowing 160 knots, Air Portugal 322 heavy, runway 27L in sight." },
        { start: 21.80, end: 25.60, text: "American 736, turn right heading 290, climb and maintain FL240." },
        { start: 25.60, end: 28.90, text: "Right heading 290, climb to flight level 240, American 736." },
        { start: 28.90, end: 33.15, text: "American 736, contact Chicago center on 126.85, good day." },
        { start: 33.15, end: 37.40, text: "Delta 1080, fly present heading, descend to 4000 feet, squawk 4721." },
        { start: 37.40, end: 41.50, text: "Maintain 4000 feet, present heading, squawk 4721, Delta 1080." },
        { start: 41.50, end: 45.80, text: "Speedbird 915, intercept localizer runway 27L, descend to 3000 feet." },
        { start: 45.80, end: 50.10, text: "Localizer established runway 27L, down to 3000 feet, Speedbird 915." },
        { start: 50.10, end: 54.20, text: "United 182 heavy, contact O'Hare tower on 119.100, good night." },
        { start: 54.20, end: 58.40, text: "119.1 over to tower, United 182 heavy, thanks for the vectors." },
        { start: 58.40, end: 63.20, text: "FedEx 2112, wind 260 at 12 knots, hold short of runway 27L." },
        { start: 63.20, end: 67.50, text: "Holding short runway 27L, FedEx 2112 heavy." },
        { start: 67.50, end: 70.87, text: "Delta 1080, turn left heading 360, cleared visual approach." }
    ],
    intermediate_chunks: [
        { chunk_num: 1, start_time: 0.0, end_time: 30.0 },
        { chunk_num: 2, start_time: 25.0, end_time: 55.0 },
        { chunk_num: 3, start_time: 50.0, end_time: 70.87 },
    ]
};
MOCK_FLIGHT_RECORD.text = MOCK_FLIGHT_RECORD.segments.map(s => s.text).join(' ');

// ---------------------------------------------------------------------------
// Airband ATC Phraseology Lexicon & Tokenizer
// ---------------------------------------------------------------------------
const ATC_PATTERNS = [
    { re: /\b(cleared|maintain|contact|descend|climb|turn left|turn right|hold short|reduce speed|intercept|squawk|radar contact|established)\b/gi, cls: 'tok-verb' },
    { re: /\b(runway\s\d{1,2}[LRC]?|RWY\s\d{1,2}[LRC]?)\b/gi, cls: 'tok-runway' },
    { re: /\b(FL\d{2,3}|flight level \d{2,3}|\d{1,2},?\d{3}\s?feet|\d{3,4}\s?ft)\b/gi, cls: 'tok-alt' },
    { re: /\b(heading\s\d{3}|HDG\s\d{3})\b/gi, cls: 'tok-heading' },
    { re: /\b(ils|dme|localizer|qnh|vfr|ifr|vor|tacan|rnav)\b/gi, cls: 'tok-nav' },
    { re: /\b(1\d{2}\.\d{1,3}\s?mhz|1\d{2}\.\d{1,3})\b/gi, cls: 'tok-freq' },
    { re: /\b(United|American|Delta|Speedbird|FedEx|Air Portugal|Southwest|Skywest|Cessna|Boeing|Airbus)\s\d{2,4}\s?(heavy)?\b/gi, cls: 'tok-callsign' }
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

function fmtDuration(sec) {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AirbandScribeConsole() {
    // Dataset & Playback States
    const [dataset, setDataset] = useState(MOCK_FLIGHT_RECORD);
    const [playhead, setPlayhead] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSegIdx, setActiveSegIdx] = useState(-1);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [audioVolume, setAudioVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [loopSegment, setLoopSegment] = useState(false);
    const [audioChannel, setAudioChannel] = useState('denoised'); // 'denoised' | 'filtered'
    const [viewMode, setViewMode] = useState('strips'); // 'strips' | 'raw'
    const [searchFilter, setSearchFilter] = useState('');
    const [activeTab, setActiveTab] = useState('intel'); // 'intel' | 'chunks' | 'diagnostics'

    // Live Zulu Clock
    const [zuluTime, setZuluTime] = useState('');
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setZuluTime(now.toISOString().slice(11, 19) + 'Z');
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Transcription History States
    const [historyList, setHistoryList] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [loadedRecordId, setLoadedRecordId] = useState(dataset.id || null);

    // Upload & Job States
    const [file, setFile] = useState(null);
    const [applyDenoise, setApplyDenoise] = useState(true);
    const [denoiseCoeff, setDenoiseCoeff] = useState(0.75);
    const [computeDevice, setComputeDevice] = useState('cpu');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [processError, setProcessError] = useState(null);

    // Audio Element & Canvas Refs
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const stripListRef = useRef(null);
    const stripRefs = useRef({});

    if (!audioRef.current) {
        audioRef.current = new Audio();
    }

    // Initialize History
    const loadHistory = useCallback(async (page = 1) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`/transcriptions?page=${page}&limit=6`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setHistoryList(data.transcriptions || []);
            setHistoryPage(data.page || 1);
            setHistoryTotal(data.total || 0);
            setHistoryTotalPages(data.pages || 1);
        } catch (err) {
            console.warn("History fetch warning:", err.message);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory(1);
    }, [loadHistory]);

    // Load History Item
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

    // Delete Historical Record
    const deleteHistoricalRecord = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm(`Delete flight recording record #${id}?`)) return;
        try {
            await fetch(`/transcriptions/${id}`, { method: 'DELETE' });
            loadHistory(historyPage);
            if (loadedRecordId === id) {
                setLoadedRecordId(null);
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    // Derived Flight Intelligence Stats
    const totalDuration = dataset.speech_duration_seconds || 1;
    const speedup = dataset.processing_time_seconds
        ? (dataset.speech_duration_seconds / dataset.processing_time_seconds).toFixed(1)
        : '1.0';

    // Extract ATC Entities Matrix
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
        const idx = dataset.segments.findIndex(s => playhead >= s.start && playhead <= s.end);
        setActiveSegIdx(idx);

        // A-B Segment Loop Check
        if (loopSegment && idx >= 0) {
            const seg = dataset.segments[idx];
            if (playhead >= seg.end - 0.05) {
                seekTo(seg.start);
            }
        }
    }, [playhead, dataset.segments, loopSegment]);

    // Auto-scroll Active Strip into View
    useEffect(() => {
        if (activeSegIdx >= 0 && stripRefs.current[activeSegIdx] && stripListRef.current) {
            const container = stripListRef.current;
            const elem = stripRefs.current[activeSegIdx];
            container.scrollTo({
                top: elem.offsetTop - container.clientHeight / 2 + elem.offsetHeight / 2,
                behavior: 'smooth'
            });
        }
    }, [activeSegIdx]);

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

        const relPath = audioChannel === 'denoised' ? dataset.denoised_full_path_rel : dataset.filtered_full_path_rel;
        const targetUrl = relPath ? `/${relPath}` : '';

        if (targetUrl && (!audio.src || !audio.src.includes(targetUrl))) {
            audio.src = targetUrl;
            audio.load();
            audio.currentTime = playhead;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.playbackRate = playbackRate;
            audio.volume = isMuted ? 0 : audioVolume;
            audio.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                    // Fallback simulated progress
                    setIsPlaying(true);
                });
        }
    };

    // Animation Loop for Playhead & Canvas Spectrogram
    useEffect(() => {
        let lastTimestamp = performance.now();
        const updateFrame = (now) => {
            const delta = (now - lastTimestamp) / 1000;
            lastTimestamp = now;

            if (isPlaying) {
                const audio = audioRef.current;
                if (audio && audio.src && !audio.paused && !isNaN(audio.currentTime)) {
                    setPlayhead(audio.currentTime);
                    if (audio.ended || audio.currentTime >= totalDuration) {
                        setIsPlaying(false);
                    }
                } else {
                    setPlayhead(prev => {
                        const next = prev + delta * playbackRate;
                        if (next >= totalDuration) {
                            setIsPlaying(false);
                            return totalDuration;
                        }
                        return next;
                    });
                }
            }

            renderCanvas();
            animRef.current = requestAnimationFrame(updateFrame);
        };

        animRef.current = requestAnimationFrame(updateFrame);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [isPlaying, totalDuration, playbackRate, audioChannel]);

    // HTML5 Canvas Waveform & Aviation Spectrogram Drawing
    const renderCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement?.clientWidth || 800;
        const height = canvas.height = 90;

        // Background tactical grid
        ctx.fillStyle = '#060a0f';
        ctx.fillRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw Transmissions (VAD blocks)
        if (dataset.segments) {
            dataset.segments.forEach(seg => {
                const x1 = (seg.start / totalDuration) * width;
                const x2 = (seg.end / totalDuration) * width;
                const isCurrent = playhead >= seg.start && playhead <= seg.end;

                ctx.fillStyle = isCurrent ? 'rgba(0, 240, 255, 0.16)' : 'rgba(16, 185, 129, 0.07)';
                ctx.fillRect(x1, 0, Math.max(x2 - x1, 2), height);

                ctx.strokeStyle = isCurrent ? '#00f0ff' : 'rgba(16, 185, 129, 0.35)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x1, 0, Math.max(x2 - x1, 2), height);
            });
        }

        // Simulated Waveform Bars
        const barCount = Math.floor(width / 4);
        const barWidth = 2.5;
        const midY = height / 2;

        for (let i = 0; i < barCount; i++) {
            const barSec = (i / barCount) * totalDuration;
            const inTransmission = (dataset.segments || []).some(s => barSec >= s.start && barSec <= s.end);

            // Pseudo-random acoustic amplitude based on position
            const noise = Math.sin(i * 0.35) * Math.cos(i * 0.72) * 0.5 + 0.5;
            let amp = inTransmission ? 12 + noise * 28 : 2 + noise * 4;
            if (audioChannel === 'filtered') amp *= 1.35; // Show more raw RF noise

            const x = i * 4;
            const isPast = barSec <= playhead;

            if (isPast) {
                ctx.fillStyle = inTransmission ? '#00f0ff' : '#334155';
            } else {
                ctx.fillStyle = inTransmission ? '#10b981' : '#1e293b';
            }

            ctx.fillRect(x, midY - amp, barWidth, amp * 2);
        }

        // Playhead Scrubber Line
        const playX = (playhead / totalDuration) * width;
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
    };

    // Canvas Scrubber Click
    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const targetSec = (clickX / rect.width) * totalDuration;
        seekTo(targetSec);
    };

    // Upload & Transcribe
    const handleUploadTranscribe = async (e) => {
        e.preventDefault();
        if (!file) return;

        setIsProcessing(true);
        setProcessError(null);
        setProcessStatus('Uploading transmission to AirbandScribe DSP pipeline...');

        const fd = new FormData();
        fd.append('file', file);
        fd.append('apply_noise_removal', applyDenoise.toString());
        fd.append('noise_reduction', denoiseCoeff.toString());
        fd.append('language', 'en');
        fd.append('save_intermediate', 'true');
        fd.append('device', computeDevice);

        try {
            const res = await fetch('/transcribe', { method: 'POST', body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Server error: ${res.status}`);
            }
            const data = await res.json();
            if (data && data.segments) {
                if (!data.text) data.text = data.segments.map(s => s.text).join(' ');
                setDataset(data);
                setLoadedRecordId(data.id || null);
                setPlayhead(0);
                setProcessStatus(`Transcription complete: ${data.segments.length} transmissions decoded.`);
                loadHistory(1);
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
        setProcessStatus('Copied to clipboard.');
        setTimeout(() => setProcessStatus(''), 2500);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seekTo(playhead - 3);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekTo(playhead + 3);
                    break;
                case 'KeyR':
                    e.preventDefault();
                    if (activeSegIdx >= 0 && dataset.segments) {
                        seekTo(dataset.segments[activeSegIdx].start);
                    }
                    break;
                case 'KeyD':
                    e.preventDefault();
                    setAudioChannel(prev => prev === 'denoised' ? 'filtered' : 'denoised');
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setIsMuted(prev => !prev);
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playhead, activeSegIdx, dataset.segments, isPlaying, audioChannel, isMuted]);

    // Filtered Transmission Segments
    const visibleSegments = useMemo(() => {
        if (!dataset.segments) return [];
        if (!searchFilter.trim()) return dataset.segments;
        const q = searchFilter.toLowerCase();
        return dataset.segments.filter(s => s.text.toLowerCase().includes(q));
    }, [dataset.segments, searchFilter]);

    return (
        <div style={styles.consoleContainer}>
            {/* Embedded Avionics Styles */}
            <style>{`
                .tok-verb { color: #f59e0b; font-weight: 600; }
                .tok-runway { color: #10b981; font-weight: 700; background: rgba(16,185,129,0.12); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(16,185,129,0.3); }
                .tok-alt { color: #38bdf8; font-weight: 600; }
                .tok-heading { color: #fb923c; font-weight: 600; }
                .tok-nav { color: #c084fc; font-weight: 600; }
                .tok-freq { color: #ec4899; font-weight: 600; }
                .tok-callsign { color: #facc15; font-weight: 700; }

                .avionics-card {
                    background: #0b1118;
                    border: 1px solid #162232;
                    border-radius: 6px;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .avionics-card:hover {
                    border-color: #233750;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }

                .strip-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 9px 12px;
                    border-bottom: 1px solid #121c28;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .strip-row:hover {
                    background: #0f1823 !important;
                }
                .strip-active {
                    background: rgba(0, 240, 255, 0.05) !important;
                    border-left: 3px solid #00f0ff !important;
                }

                .btn-tactical {
                    background: #111a26;
                    border: 1px solid #1e2e42;
                    color: #94a3b8;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    font-weight: 500;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .btn-tactical:hover {
                    background: #192638;
                    color: #f1f5f9;
                    border-color: #3b82f6;
                }
                .btn-tactical.active {
                    background: #00f0ff;
                    color: #06090e;
                    border-color: #00f0ff;
                    font-weight: 700;
                }

                .history-item {
                    padding: 8px 10px;
                    border-bottom: 1px solid #14202e;
                    cursor: pointer;
                    transition: background 0.15s ease;
                }
                .history-item:hover {
                    background: #101a26;
                }
                .history-item.active {
                    background: rgba(16, 185, 129, 0.08);
                    border-left: 2px solid #10b981;
                }

                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #070c12; }
                ::-webkit-scrollbar-thumb { background: #1c2b3e; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #2d4463; }
            `}</style>

            {/* TOP NAVIGATION / TELEMETRY DECK */}
            <header style={styles.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={styles.radarBeacon}>
                        <div style={styles.radarDot} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.brandTitle}>AIRBAND<span style={{ color: '#00f0ff' }}>SCRIBE</span></span>
                            <span style={styles.versionTag}>v1.2.0-STARS</span>
                        </div>
                        <span style={styles.brandSub}>AERONAUTICAL VHF SPEECH SIGNAL INTELLIGENCE CONSOLE</span>
                    </div>
                </div>

                {/* Telemetry Live Bar */}
                <div style={styles.telemetryGroup}>
                    <div style={styles.telemetryPill}>
                        <span style={styles.pillLabel}>ZULU UTC</span>
                        <span style={{ ...styles.pillVal, color: '#f59e0b' }}>{zuluTime || '00:00:00Z'}</span>
                    </div>
                    <div style={styles.telemetryPill}>
                        <span style={styles.pillLabel}>AIRBAND FREQ</span>
                        <span style={styles.pillVal}>118.000–136.975 MHz</span>
                    </div>
                    <div style={styles.telemetryPill}>
                        <span style={styles.pillLabel}>DSP ENGINE</span>
                        <span style={{ ...styles.pillVal, color: '#10b981' }}>BUTTERWORTH 5P + NOISEREDUCE</span>
                    </div>
                    <div style={styles.telemetryPill}>
                        <span style={styles.pillLabel}>COMPUTE DEVICE</span>
                        <span style={{ ...styles.pillVal, color: dataset.device === 'cuda' ? '#10b981' : '#38bdf8' }}>
                            {dataset.device ? dataset.device.toUpperCase() : 'CPU (AVX2)'}
                        </span>
                    </div>
                    <div style={styles.telemetryPill}>
                        <span style={styles.pillLabel}>RTF SPEEDUP</span>
                        <span style={{ ...styles.pillVal, color: '#00f0ff' }}>{speedup}x</span>
                    </div>
                </div>
            </header>

            {/* MAIN OPERATIONAL DECK */}
            <main style={styles.mainContent}>
                {/* TOP ROW: INGESTION + ATC ENTITY MATRIX */}
                <div style={styles.topRowGrid}>
                    {/* INGESTION & DSP CONTROLS */}
                    <div className="avionics-card" style={{ padding: 14 }}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionTitle}>TRANSMISSION INGESTION & DSP PIPELINE</span>
                            {isProcessing && <span style={styles.pulseActive}>PROCESSING AUDIO...</span>}
                        </div>

                        <form onSubmit={handleUploadTranscribe} style={styles.ingestForm}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={styles.inputLabel}>VHF AUDIO STREAM (.WAV / .MP3)</label>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        style={styles.fileInput}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={styles.inputLabel}>INFERENCE DEVICE</label>
                                    <select
                                        value={computeDevice}
                                        onChange={(e) => setComputeDevice(e.target.value)}
                                        style={styles.selectInput}
                                    >
                                        <option value="cpu">CPU (Intel AVX2 SIMD)</option>
                                        <option value="cuda">CUDA (NVIDIA TensorRT)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.inputLabel}>SPECTRAL NOISE GATE</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                                        <input
                                            type="checkbox"
                                            checked={applyDenoise}
                                            onChange={(e) => setApplyDenoise(e.target.checked)}
                                            id="denoiseCheck"
                                        />
                                        <label htmlFor="denoiseCheck" style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#94a3b8' }}>
                                            Filter ({denoiseCoeff * 100}%)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                                    Bandpass: 100Hz–8000Hz | Silero VAD v6.2 | Hotwords: ICAO phraseology
                                </span>
                                <button
                                    type="submit"
                                    disabled={isProcessing || !file}
                                    style={{
                                        ...styles.actionSubmitBtn,
                                        opacity: isProcessing || !file ? 0.5 : 1,
                                        cursor: isProcessing || !file ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isProcessing ? 'PROCESSING DSP...' : 'INGEST & TRANSCRIBE VHF'}
                                </button>
                            </div>
                        </form>

                        {processStatus && <div style={styles.statusBarNotice}>{processStatus}</div>}
                        {processError && <div style={styles.errorNotice}>ERROR: {processError}</div>}
                    </div>

                    {/* ATC FLIGHT ENTITY MATRIX */}
                    <div className="avionics-card" style={{ padding: 14 }}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionTitle}>EXTRACTED AVIATION TELEMETRY</span>
                            <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono' }}>ICAO PARSER</span>
                        </div>

                        <div style={styles.entityMatrixGrid}>
                            <div style={styles.entityCard}>
                                <div style={styles.entityHeader}>✈️ CALLSIGNS</div>
                                <div style={styles.entityPillContainer}>
                                    {extractedEntities.callsigns.length > 0 ? (
                                        extractedEntities.callsigns.map((c, i) => (
                                            <span key={i} className="tok-callsign" style={styles.entityChip}>{c}</span>
                                        ))
                                    ) : (
                                        <span style={styles.emptyNote}>No callsign logged</span>
                                    )}
                                </div>
                            </div>

                            <div style={styles.entityCard}>
                                <div style={styles.entityHeader}>🛫 RUNWAYS</div>
                                <div style={styles.entityPillContainer}>
                                    {extractedEntities.runways.length > 0 ? (
                                        extractedEntities.runways.map((r, i) => (
                                            <span key={i} className="tok-runway" style={styles.entityChip}>{r}</span>
                                        ))
                                    ) : (
                                        <span style={styles.emptyNote}>No active runways</span>
                                    )}
                                </div>
                            </div>

                            <div style={styles.entityCard}>
                                <div style={styles.entityHeader}>🧭 HEADINGS</div>
                                <div style={styles.entityPillContainer}>
                                    {extractedEntities.headings.length > 0 ? (
                                        extractedEntities.headings.map((h, i) => (
                                            <span key={i} className="tok-heading" style={styles.entityChip}>{h}</span>
                                        ))
                                    ) : (
                                        <span style={styles.emptyNote}>No vector headings</span>
                                    )}
                                </div>
                            </div>

                            <div style={styles.entityCard}>
                                <div style={styles.entityHeader}>⛰️ ALTITUDES / FL</div>
                                <div style={styles.entityPillContainer}>
                                    {extractedEntities.altitudes.length > 0 ? (
                                        extractedEntities.altitudes.map((a, i) => (
                                            <span key={i} className="tok-alt" style={styles.entityChip}>{a}</span>
                                        ))
                                    ) : (
                                        <span style={styles.emptyNote}>No altitude targets</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE ROW: INTERACTIVE WAVEFORM & FLIGHT RECORDER SCRUBBER */}
                <div className="avionics-card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={styles.sectionTitle}>TIME-DOMAIN WAVEFORM & SPECTRAL ENERGY</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={() => setAudioChannel('denoised')}
                                    className={`btn-tactical ${audioChannel === 'denoised' ? 'active' : ''}`}
                                >
                                    CLEANED VHF
                                </button>
                                <button
                                    onClick={() => setAudioChannel('filtered')}
                                    className={`btn-tactical ${audioChannel === 'filtered' ? 'active' : ''}`}
                                >
                                    BANDPASS RAW
                                </button>
                            </div>
                        </div>

                        {/* Transport Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.timecodeDisplay}>
                                {fmtZulu(playhead)} / {fmtZulu(totalDuration)}
                            </span>

                            <button
                                onClick={() => setLoopSegment(prev => !prev)}
                                className={`btn-tactical ${loopSegment ? 'active' : ''}`}
                                title="Loop Active Segment (A-B Repeat)"
                            >
                                ⟲ LOOP
                            </button>

                            <select
                                value={playbackRate}
                                onChange={(e) => {
                                    const r = parseFloat(e.target.value);
                                    setPlaybackRate(r);
                                    if (audioRef.current) audioRef.current.playbackRate = r;
                                }}
                                style={styles.rateSelect}
                            >
                                <option value="0.75">0.75x</option>
                                <option value="1.0">1.0x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                            </select>

                            <button onClick={togglePlay} style={styles.playMasterBtn}>
                                {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                            </button>
                        </div>
                    </div>

                    {/* Canvas Scrubber */}
                    <div style={{ position: 'relative', cursor: 'crosshair' }} onClick={handleCanvasClick}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: 90, display: 'block', borderRadius: 4 }} />
                    </div>

                    {/* Active Transmission HUD Subtitle */}
                    <div style={styles.transmissionHud}>
                        {activeSegIdx >= 0 && dataset.segments && dataset.segments[activeSegIdx] ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={styles.hudBadge}>
                                    TRANSMISSION #{activeSegIdx + 1} [{fmtZulu(dataset.segments[activeSegIdx].start)} - {fmtZulu(dataset.segments[activeSegIdx].end)}]
                                </span>
                                <span style={styles.hudTransmissionText}>
                                    {tagAviationText(dataset.segments[activeSegIdx].text).map((tok, i) => (
                                        tok.cls ? <span key={i} className={tok.cls}>{tok.t}</span> : <span key={i}>{tok.t}</span>
                                    ))}
                                </span>
                            </div>
                        ) : (
                            <span style={styles.hudIdle}>[ STANDBY // LISTENING FOR VHF AIRBAND TRANSMISSION ]</span>
                        )}
                    </div>
                </div>

                {/* BOTTOM ROW: FLIGHT PROGRESS STRIPS (TRANSCRIPT) & LOGBOOK DRAWER */}
                <div style={styles.bottomRowGrid}>
                    {/* FLIGHT PROGRESS STRIPS (LEFT PANEL) */}
                    <div className="avionics-card" style={{ padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={styles.sectionTitle}>FLIGHT PROGRESS STRIPS</span>
                                <span style={styles.countBadge}>
                                    {visibleSegments.length} / {dataset.segments ? dataset.segments.length : 0} TRANSMISSIONS
                                </span>
                            </div>

                            {/* View Mode & Export Suite */}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="text"
                                    placeholder="Filter callsign / runway..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    style={styles.searchInput}
                                />
                                <button onClick={exportAsSRT} className="btn-tactical" title="Export SubRip Subtitles">
                                    .SRT
                                </button>
                                <button onClick={exportAsJSON} className="btn-tactical" title="Export ICAO Telemetry JSON">
                                    .JSON
                                </button>
                                <button onClick={exportAsTXT} className="btn-tactical" title="Export Plain Text Dispatch">
                                    .TXT
                                </button>
                                <button
                                    onClick={() => copyToClipboard(dataset.text || '')}
                                    className="btn-tactical"
                                    title="Copy Clean Transcript"
                                >
                                    COPY
                                </button>
                            </div>
                        </div>

                        {/* Strip Container */}
                        <div ref={stripListRef} style={styles.stripListScroll}>
                            {visibleSegments.length > 0 ? (
                                visibleSegments.map((seg, idx) => {
                                    const isActive = idx === activeSegIdx;
                                    return (
                                        <div
                                            key={idx}
                                            ref={(el) => (stripRefs.current[idx] = el)}
                                            onClick={() => seekTo(seg.start)}
                                            className={`strip-row ${isActive ? 'strip-active' : ''}`}
                                        >
                                            <div style={styles.stripMetaCol}>
                                                <span style={styles.stripTimePill}>{fmtZulu(seg.start)}</span>
                                                <span style={styles.stripDuration}>{(seg.end - seg.start).toFixed(1)}s</span>
                                            </div>

                                            <div style={styles.stripBodyCol}>
                                                <div style={styles.stripText}>
                                                    {tagAviationText(seg.text).map((tok, i) => (
                                                        tok.cls ? <span key={i} className={tok.cls}>{tok.t}</span> : <span key={i}>{tok.t}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(seg.text); }}
                                                className="btn-tactical"
                                                style={{ fontSize: 9, padding: '2px 6px' }}
                                                title="Copy transmission"
                                            >
                                                CPY
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={styles.emptyNoteLarge}>No transmission matches filter "{searchFilter}"</div>
                            )}
                        </div>

                        {/* ATC PHRASEOLOGY LEGEND */}
                        <div style={styles.legendBar}>
                            <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono', marginRight: 6 }}>TAGS:</span>
                            <span className="tok-callsign" style={styles.legendChip}>CALLSIGN</span>
                            <span className="tok-verb" style={styles.legendChip}>INSTRUCTION / VERB</span>
                            <span className="tok-runway" style={styles.legendChip}>RUNWAY</span>
                            <span className="tok-heading" style={styles.legendChip}>HEADING / VECTOR</span>
                            <span className="tok-alt" style={styles.legendChip}>ALTITUDE / FL</span>
                            <span className="tok-nav" style={styles.legendChip}>NAV AID</span>
                            <span className="tok-freq" style={styles.legendChip}>FREQUENCY</span>
                        </div>
                    </div>

                    {/* FLIGHT LOGBOOK & AUDIT TRAIL (RIGHT PANEL) */}
                    <div className="avionics-card" style={{ padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={styles.sectionTitle}>FLIGHT RECORDER LOGBOOK</span>
                            <button onClick={() => loadHistory(historyPage)} className="btn-tactical" title="Refresh Database">
                                ↻ SYNC
                            </button>
                        </div>

                        <div style={styles.historyListScroll}>
                            {historyLoading ? (
                                <div style={styles.emptyNoteLarge}>Loading database records...</div>
                            ) : historyList.length > 0 ? (
                                historyList.map((rec) => {
                                    const isLoaded = rec.id === loadedRecordId;
                                    return (
                                        <div
                                            key={rec.id}
                                            onClick={() => loadHistoricalRecord(rec.id)}
                                            className={`history-item ${isLoaded ? 'active' : ''}`}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={styles.historyFilename} title={rec.filename}>{rec.filename}</span>
                                                <button
                                                    onClick={(e) => deleteHistoricalRecord(e, rec.id)}
                                                    style={styles.deleteBtn}
                                                    title="Purge record"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, fontFamily: 'JetBrains Mono', color: '#64748b' }}>
                                                <span>{fmtDuration(rec.speech_duration_seconds)}</span>
                                                <span style={{ color: rec.device === 'cuda' ? '#10b981' : '#38bdf8' }}>
                                                    {rec.device?.toUpperCase()}
                                                </span>
                                                <span>{rec.created_at ? rec.created_at.split(' ')[0] : (rec.timestamp || 'LOG')}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={styles.emptyNoteLarge}>No past recordings found in database</div>
                            )}
                        </div>

                        {/* Pagination */}
                        {historyTotalPages > 1 && (
                            <div style={styles.paginationRow}>
                                <button
                                    onClick={() => loadHistory(historyPage - 1)}
                                    disabled={historyPage <= 1}
                                    className="btn-tactical"
                                >
                                    ◀
                                </button>
                                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#94a3b8' }}>
                                    PG {historyPage} / {historyTotalPages}
                                </span>
                                <button
                                    onClick={() => loadHistory(historyPage + 1)}
                                    disabled={historyPage >= historyTotalPages}
                                    className="btn-tactical"
                                >
                                    ▶
                                </button>
                            </div>
                        )}

                        {/* HOTKEY QUICK REFERENCE */}
                        <div style={styles.hotkeyFooter}>
                            <div style={styles.hotkeyItem}><kbd style={styles.kbd}>SPACE</kbd> PLAY/PAUSE</div>
                            <div style={styles.hotkeyItem}><kbd style={styles.kbd}>←/→</kbd> ±3s SEEK</div>
                            <div style={styles.hotkeyItem}><kbd style={styles.kbd}>R</kbd> REPLAY SEG</div>
                            <div style={styles.hotkeyItem}><kbd style={styles.kbd}>D</kbd> A/B AUDIO</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Consolidated Avionics Styling Tokens
// ---------------------------------------------------------------------------
const styles = {
    consoleContainer: {
        background: '#06090e',
        minHeight: '100vh',
        color: '#e2e8f0',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
    },
    topBar: {
        background: '#090e15',
        borderBottom: '1px solid #162232',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    radarBeacon: {
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '1.5px solid #00f0ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 240, 255, 0.08)',
    },
    radarDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#00f0ff',
        boxShadow: '0 0 10px #00f0ff',
    },
    brandTitle: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 2,
        color: '#f8fafc',
    },
    versionTag: {
        fontSize: 9,
        background: '#162438',
        border: '1px solid #233750',
        padding: '2px 5px',
        borderRadius: 3,
        color: '#38bdf8',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
    },
    brandSub: {
        display: 'block',
        fontSize: 9,
        color: '#64748b',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 1.5,
    },
    telemetryGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    telemetryPill: {
        background: '#0d1520',
        border: '1px solid #1a293c',
        borderRadius: 4,
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column',
    },
    pillLabel: {
        fontSize: 8,
        color: '#64748b',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 1,
    },
    pillVal: {
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#f1f5f9',
    },
    mainContent: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1600,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
    },
    topRowGrid: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: 14,
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottom: '1px solid #14202e',
        paddingBottom: 6,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        letterSpacing: 1.5,
        color: '#94a3b8',
    },
    pulseActive: {
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#00f0ff',
        animation: 'blink 1.5s infinite',
    },
    ingestForm: {
        display: 'flex',
        flexDirection: 'column',
    },
    inputLabel: {
        display: 'block',
        fontSize: 9,
        color: '#64748b',
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
        letterSpacing: 1,
    },
    fileInput: {
        width: '100%',
        background: '#090f17',
        border: '1px solid #1c2b3d',
        borderRadius: 4,
        padding: '5px 8px',
        color: '#cbd5e1',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        boxSizing: 'border-box',
    },
    selectInput: {
        width: '100%',
        height: 32,
        background: '#090f17',
        border: '1px solid #1c2b3d',
        borderRadius: 4,
        padding: '4px 8px',
        color: '#cbd5e1',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
    },
    actionSubmitBtn: {
        background: '#00f0ff',
        color: '#06090e',
        border: 'none',
        borderRadius: 4,
        padding: '8px 16px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1,
        boxShadow: '0 0 14px rgba(0,240,255,0.3)',
    },
    statusBarNotice: {
        marginTop: 10,
        padding: '6px 10px',
        background: 'rgba(0, 240, 255, 0.08)',
        borderLeft: '3px solid #00f0ff',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#38bdf8',
    },
    errorNotice: {
        marginTop: 10,
        padding: '6px 10px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderLeft: '3px solid #ef4444',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#f87171',
    },
    entityMatrixGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
    },
    entityCard: {
        background: '#070c12',
        border: '1px solid #14202e',
        borderRadius: 4,
        padding: 8,
        minHeight: 60,
    },
    entityHeader: {
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#64748b',
        marginBottom: 6,
        letterSpacing: 1,
    },
    entityPillContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
    },
    entityChip: {
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        background: '#0f1722',
        padding: '2px 5px',
        borderRadius: 3,
        border: '1px solid #1e2c3e',
    },
    emptyNote: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#475569',
        fontFamily: "'JetBrains Mono', monospace",
    },
    emptyNoteLarge: {
        padding: 20,
        textAlign: 'center',
        fontSize: 11,
        color: '#475569',
        fontFamily: "'JetBrains Mono', monospace",
    },
    timecodeDisplay: {
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#00f0ff',
        fontWeight: 700,
        background: '#091018',
        padding: '4px 8px',
        borderRadius: 4,
        border: '1px solid #162436',
    },
    rateSelect: {
        background: '#111a26',
        border: '1px solid #1e2e42',
        color: '#94a3b8',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        borderRadius: 4,
        padding: '4px 6px',
    },
    playMasterBtn: {
        background: '#10b981',
        border: 'none',
        color: '#06090e',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 800,
        padding: '6px 14px',
        borderRadius: 4,
        cursor: 'pointer',
        boxShadow: '0 0 12px rgba(16,185,129,0.3)',
    },
    transmissionHud: {
        marginTop: 10,
        background: '#070c12',
        border: '1px solid #14202e',
        borderRadius: 4,
        padding: '8px 12px',
        minHeight: 38,
        display: 'flex',
        alignItems: 'center',
    },
    hudBadge: {
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        background: '#162232',
        color: '#38bdf8',
        padding: '3px 6px',
        borderRadius: 3,
        fontWeight: 700,
        flexShrink: 0,
    },
    hudTransmissionText: {
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: 0.3,
    },
    hudIdle: {
        fontSize: 10,
        color: '#475569',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 1.5,
    },
    bottomRowGrid: {
        display: 'grid',
        gridTemplateColumns: '1.7fr 1fr',
        gap: 14,
    },
    countBadge: {
        fontSize: 9,
        background: '#0e1824',
        border: '1px solid #18283c',
        color: '#38bdf8',
        padding: '2px 6px',
        borderRadius: 3,
        fontFamily: "'JetBrains Mono', monospace",
    },
    searchInput: {
        background: '#090f17',
        border: '1px solid #1c2b3d',
        borderRadius: 4,
        padding: '4px 8px',
        color: '#cbd5e1',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        width: 170,
    },
    stripListScroll: {
        maxHeight: 380,
        overflowY: 'auto',
        background: '#070b10',
        border: '1px solid #14202e',
        borderRadius: 4,
    },
    stripMetaCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        flexShrink: 0,
        width: 82,
    },
    stripTimePill: {
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#00f0ff',
        fontWeight: 700,
    },
    stripDuration: {
        fontSize: 8,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#475569',
    },
    stripBodyCol: {
        flex: 1,
    },
    stripText: {
        fontSize: 12,
        lineHeight: 1.5,
    },
    legendBar: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px solid #121c28',
    },
    legendChip: {
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        padding: '1px 4px',
    },
    historyListScroll: {
        maxHeight: 280,
        overflowY: 'auto',
        background: '#070b10',
        border: '1px solid #14202e',
        borderRadius: 4,
        flex: 1,
    },
    historyFilename: {
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        color: '#cbd5e1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 220,
    },
    deleteBtn: {
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        cursor: 'pointer',
        fontSize: 11,
        padding: 0,
    },
    paginationRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    hotkeyFooter: {
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px solid #121c28',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
    },
    hotkeyItem: {
        fontSize: 9,
        color: '#64748b',
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    kbd: {
        background: '#162232',
        border: '1px solid #233750',
        color: '#94a3b8',
        borderRadius: 2,
        padding: '1px 3px',
        fontSize: 8,
    }
};
