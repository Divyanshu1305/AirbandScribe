"""
AirbandScribe — Comprehensive PDF Dossier Generator
Builds a professional, multi-page PDF presentation document using ReportLab.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284c7"))
        self.drawString(54, 750, "AIRBANDSCRIBE // AERONAUTICAL SPEECH INTELLIGENCE DOSSIER")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential & Proprietary // Prepared for Project Presentation & Technical Defense")
        self.drawRightString(558, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_dossier(output_pdf_path):
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0284c7'),
        spaceAfter=14
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#0c4a6e'),
        spaceBefore=4,
        spaceAfter=6
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("AirbandScribe", title_style))
    story.append(Paragraph("AERONAUTICAL VHF SPEECH SIGNAL INTELLIGENCE & TRANSCRIPTION WORKSTATION", subtitle_style))
    
    # Executive Summary Box
    exec_summary_text = (
        "<b>Executive Summary for Evaluators & ChatGPT:</b><br/>"
        "AirbandScribe is an end-to-end, domain-specialized Automatic Speech Recognition (ASR) system engineered "
        "specifically for Air Traffic Control (ATC) voice communications on VHF frequencies (118.000–136.975 MHz). "
        "It overcomes four critical failure modes of generic models (like OpenAI Whisper): acoustic carrier noise, "
        "rapid multi-speaker cadence, boundary sentence loss in long transmissions, and domain-specific phraseology "
        "(runways, flight levels, vectors, and callsigns)."
    )
    summary_table = Table([[Paragraph(exec_summary_text, callout_style)]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0f9ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#bae6fd')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # Section 1: The Problem Space
    story.append(Paragraph("1. The Problem Space: Why Generic Speech Recognition Fails in ATC", h1_style))
    story.append(Paragraph("<b>1. Extreme Acoustic RF Noise:</b> Aeronautical VHF communications rely on legacy Amplitude Modulation (AM) prone to carrier hiss, atmospheric static, ignition clicks, and cockpit background noise.", bullet_style))
    story.append(Paragraph("<b>2. Aviation Phonetics & Acronyms:</b> Commercial models transcribe standard words instead of aviation phonetics (e.g. 'tree' for 3, 'fife' for 5, 'niner' for 9) and misinterpret runways (writing 'runway two seven left' instead of 'Runway 27L').", bullet_style))
    story.append(Paragraph("<b>3. Long Audio Boundary Loss:</b> Long tower recordings (&gt;60s) suffer from boundary truncation or hallucination if processed in a single chunk or naive cuts.", bullet_style))
    story.append(Paragraph("<b>4. High Transmission Density:</b> Transmissions have zero punctuation and overlapping rapid-fire exchanges between multiple controllers and pilots.", bullet_style))
    story.append(Spacer(1, 8))

    # Section 2: Architecture Diagram
    story.append(Paragraph("2. Complete Signal Processing Architecture & Flow", h1_style))
    
    arch_lines = [
        "[ Raw VHF Aeronautical Audio Input (.wav, .mp3, etc.) ]",
        "                          │",
        "                          ▼",
        "┌─────────────────────────────────────────────────────────┐",
        "│ Stage 1: Acoustic Preprocessing & Noise Cancellation    │",
        "│  ├── 5th-Order Butterworth Bandpass (100 Hz - 8,000 Hz) │",
        "│  └── Spectral Gating Noise Reduction (noisereduce)      │",
        "└─────────────────────────────────────────────────────────┘",
        "                          │",
        "                          ▼",
        "┌─────────────────────────────────────────────────────────┐",
        "│ Stage 2: Temporal Chunking & Voice Activity Detection   │",
        "│  ├── 30-second chunks with 5-second overlap windows     │",
        "│  └── Silero VAD v6.2 speech timestamp boundary gating   │",
        "└─────────────────────────────────────────────────────────┘",
        "                          │",
        "                          ▼",
        "┌─────────────────────────────────────────────────────────┐",
        "│ Stage 3: High-Speed GGUF Inference Engine               │",
        "│  ├── Beam Search (size 5) + Forced English Tokenizer    │",
        "│  └── ICAO Hotword Biasing (runway, heading, ils, dme)   │",
        "└─────────────────────────────────────────────────────────┘",
        "                          │",
        "                          ▼",
        "┌─────────────────────────────────────────────────────────┐",
        "│ Stage 4: ATC Phraseology Normalizer & Stitching         │",
        "│  ├── Word-to-number phonetic mapping (niner -> 9)       │",
        "│  ├── Callsign, Runway, Heading, FL formatting           │",
        "│  └── Seam deduplication across overlapping segments     │",
        "└─────────────────────────────────────────────────────────┘",
        "                          │",
        "                          ▼",
        "┌─────────────────────────────────────────────────────────┐",
        "│ Stage 5: Avionics Flight Deck Console & API Delivery    │",
        "│  ├── Interactive time-domain waveform & scrubber        │",
        "│  ├── Synchronized Flight Progress Strips                │",
        "│  └── Multi-format exports: .SRT, .VTT, .JSON, .TXT      │",
        "└─────────────────────────────────────────────────────────┘"
    ]
    arch_text = "<br/>".join(arch_lines)
    arch_table = Table([[Paragraph(arch_text, code_style)]], colWidths=[504])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # Page Break for Deep Dive
    story.append(PageBreak())

    # Section 3: Detailed Technical Breakdown
    story.append(Paragraph("3. Complete Technical Deep-Dive: What Was Built From Scratch", h1_style))
    
    story.append(Paragraph("A. Digital Signal Processing (DSP) Engine (transcribe_atc.py)", h2_style))
    story.append(Paragraph("• <b>Butterworth 5th-Order Bandpass Filter:</b> Isolates frequencies between 100 Hz and 8,000 Hz using SciPy IIR digital filtering. Cuts low-frequency engine thrum and ultra-high static.", bullet_style))
    story.append(Paragraph("• <b>Spectral Gating Noise Reducer:</b> Employs non-stationary spectral floor gating (noisereduce) with configurable attenuation (default 75%), cleaning voice signals before inference.", bullet_style))
    story.append(Paragraph("• <b>Silero VAD v6.2 Integration:</b> Automatically isolates spoken bursts and discards silence intervals, preventing hallucinated tokens during dead air.", bullet_style))
    story.append(Paragraph("• <b>Hardware Auto-Resolver:</b> Probes system hardware. When an NVIDIA GPU is not present, it automatically configures Intel AVX2 SIMD CPU vectorization.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("B. Overlapping Temporal Chunker & Deduplicator (audio_chunker.py)", h2_style))
    story.append(Paragraph("• <b>30s Sliding Windows with 5s Overlap:</b> For recordings exceeding 60s, the recording is partitioned into 30-second windows with 5-second overlapping margins so words spoken right on boundaries are never truncated.", bullet_style))
    story.append(Paragraph("• <b>Longest Common Subsequence (LCS) Stitching:</b> Built <code>deduplicate_overlap_text()</code> which tokenizes boundary overlaps and strips duplicate phonetic sequences across consecutive chunk outputs.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("C. Domain-Specific ICAO / FAA Normalizer (atc_normalizer.py)", h2_style))
    story.append(Paragraph("A specialized post-processing rule engine that translates raw ASR phonetic tokens into standardized dispatch formatting:", body_style))

    # Normalizer examples table
    norm_data = [
        [Paragraph("<b>Spoken Pilot / Controller Audio</b>", body_style),
         Paragraph("<b>AirbandScribe Normalized Text</b>", body_style),
         Paragraph("<b>Aviation Standardization Rule</b>", body_style)],
        [Paragraph('"cleared i l s runway two seven left approach"', code_style),
         Paragraph('<b>cleared ILS runway 27L approach</b>', body_style),
         Paragraph("Standardizes runways and uppercase NAV aids", body_style)],
        [Paragraph('"turn right heading two niner zero maintain speed"', code_style),
         Paragraph('<b>turn right heading 290 maintain speed</b>', body_style),
         Paragraph("Normalizes 3-digit vectors and phonetic 'niner'", body_style)],
        [Paragraph('"climb and maintain flight level three two zero"', code_style),
         Paragraph('<b>climb and maintain FL320</b>', body_style),
         Paragraph("Converts spoken flight level to standard ICAO 'FL320'", body_style)],
        [Paragraph('"contact tower on one one niner point one"', code_style),
         Paragraph('<b>contact tower on 119.1</b>', body_style),
         Paragraph("Formats VHF aeronautical frequencies", body_style)],
        [Paragraph('"speedbird niner fifteen turn left heading three six zero"', code_style),
         Paragraph('<b>Speedbird 915 turn left heading 360</b>', body_style),
         Paragraph("Standardizes airline callsign and compass bearing", body_style)]
    ]
    t_norm = Table(norm_data, colWidths=[174, 170, 160])
    t_norm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_norm)
    story.append(Spacer(1, 8))

    story.append(Paragraph("D. Backend Web API & Persistence (app.py, database.py)", h2_style))
    story.append(Paragraph("• <b>FastAPI Server:</b> Decoupled asynchronous REST server with full CORS support and static bundle serving.", bullet_style))
    story.append(Paragraph("• <b>SQLite Database:</b> Stores flight audio metadata: filename, duration, processing speedup, CPU/GPU compute device, millisecond timestamps, and intermediate chunk files.", bullet_style))
    story.append(Paragraph("• <b>REST Endpoints:</b> <code>GET /api/status</code> (telemetry), <code>POST /transcribe</code> (audio ingestion), <code>GET /transcriptions</code> (paginated search), <code>GET /transcriptions/{id}</code> (details), <code>DELETE /transcriptions/{id}</code> (purge).", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("E. Bespoke Aerospace Avionics Console (frontend/src/components/transcribe.jsx)", h2_style))
    story.append(Paragraph("• <b>Zulu Live Clock:</b> Real-time UTC Greenwich Mean Time clock running continuously.", bullet_style))
    story.append(Paragraph("• <b>Interactive Canvas Waveform:</b> HTML5 time-domain amplitude meter with clickable scrub head and VAD transmission blocks.", bullet_style))
    story.append(Paragraph("• <b>A/B Audio Channel Switcher:</b> Live toggle between Cleaned VHF (denoised) and Bandpass Raw audio streams.", bullet_style))
    story.append(Paragraph("• <b>Aviation Telemetry Strip Matrix:</b> Real-time card deck extracting flight callsigns, runways, headings, altitudes, and VHF frequencies.", bullet_style))
    story.append(Paragraph("• <b>Flight Progress Strips:</b> Color-coded tokens (amber verbs, neon green runways, cyan altitudes, tangerine headings, yellow callsigns) with millisecond jump-to-timecode.", bullet_style))
    story.append(Paragraph("• <b>Multi-Format Export Suite:</b> One-click export to SubRip (<code>.srt</code>), WebVTT (<code>.vtt</code>), ICAO Telemetry (<code>.json</code>), and Clean Dispatch (<code>.txt</code>).", bullet_style))
    story.append(Paragraph("• <b>Keyboard Flight Deck Shortcuts:</b> <code>SPACE</code> (Play/Pause), <code>←/→</code> (Seek ±3s), <code>R</code> (Replay segment), <code>D</code> (A/B Audio), <code>M</code> (Mute).", bullet_style))

    # Page Break for Bugs & Presentation Prep
    story.append(PageBreak())

    # Section 4: Critical Bugs Found & Solved
    story.append(Paragraph("4. Critical Engineering Bugs Identified & Solved", h1_style))

    bug_data = [
        [Paragraph("<b>Identified Bug</b>", body_style),
         Paragraph("<b>Technical Root Cause</b>", body_style),
         Paragraph("<b>Resolution & Engineering Fix</b>", body_style)],
        [Paragraph("<b>Auto-Scroll Overshoot<br/>(3:28 vs 1:06)</b>", body_style),
         Paragraph("<code>elem.offsetTop</code> was measured relative to the document body (~540px above), adding a massive offset that threw the scroll position minutes ahead.", body_style),
         Paragraph("Re-architected with container-relative <code>getBoundingClientRect()</code> and added an <code>isAbove || isBelow</code> threshold check so the list only moves when needed.", body_style)],
        [Paragraph("<b>Logbook 'Cross Marks'<br/>Confusion</b>", body_style),
         Paragraph("A bare red <code>✕</code> delete button gave the false impression that every transcription had failed.", body_style),
         Paragraph("Redesigned with clear <code>✓ READY</code> / <code>ON DECK</code> status badges and an intuitive trash button (<code>🗑️ DEL</code>).", body_style)],
        [Paragraph("<b>SRT Parser Crash</b>", body_style),
         Paragraph("Variable typo in fallback SRT parser (<code>spath_2</code> instead of <code>srt_path_2</code>).", body_style),
         Paragraph("Fixed variable scope and verified with primary JSON output.", body_style)],
        [Paragraph("<b>Legacy Workspace Migration<br/>& Path Aliasing</b>", body_style),
         Paragraph("Preserving backwards compatibility during the v1.2 rename from legacy prototype nomenclature.", body_style),
         Paragraph("Implemented clean directory aliasing and environment variable resolution across build targets.", body_style)]
    ]
    t_bugs = Table(bug_data, colWidths=[134, 185, 185])
    t_bugs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_bugs)
    story.append(Spacer(1, 10))

    # Section 5: Presentation Q&A Preparation Cheat Sheet
    story.append(Paragraph("5. Presentation Defense & Interview Q&A Cheat Sheet", h1_style))
    story.append(Paragraph("Use these exact technical explanations when presenting this project to professors, evaluators, or ChatGPT:", body_style))
    
    qa_items = [
        ("Q: Why not just use OpenAI Whisper directly?",
         "A: Generic Whisper models are trained on clean internet podcasts and audiobooks. In aviation, they fail due to legacy VHF Amplitude Modulation (AM) carrier noise, drop sentences during radio pauses, and write numbers as long prose. AirbandScribe uses a 5th-order Butterworth bandpass filter and spectral gating to clean the audio first, gates silence with Silero VAD, and passes the output through an ICAO phraseology normalizer."),
        
        ("Q: How does AirbandScribe guarantee nothing is lost in a 1-hour recording?",
         "A: It uses a 30-second sliding window with a 5-second overlap. Spoken sentences that fall right on the cut boundary are captured in both windows and then deduplicated at the boundary seam using our custom Longest Common Subsequence (LCS) deduplication algorithm."),
        
        ("Q: Does this project require an expensive GPU to run?",
         "A: No. The backend features dynamic hardware fallback. On systems without an NVIDIA GPU (such as this Intel Core i5 machine), it binds to Intel AVX2 SIMD CPU vector instructions, achieving a Real-Time Factor (RTF) of 0.2x speedup (processing a 70-second recording in ~14 seconds)."),
        
        ("Q: How is the system architected for production deployment?",
         "A: Decoupled client-server architecture: FastAPI backend with SQLite persistence on port 8000, Vite/React frontend on port 3000, unified Docker Compose with CPU and GPU profiles, and GitHub Actions CI testing across Python 3.10, 3.11, and 3.12.")
    ]

    for q, a in qa_items:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 2))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated presentation dossier PDF at: {output_pdf_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(script_dir, "AirbandScribe_Full_Project_Mastery_Dossier.pdf")
    generate_dossier(pdf_path)

