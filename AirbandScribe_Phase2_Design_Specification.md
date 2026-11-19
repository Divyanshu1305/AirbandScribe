# AIRBANDSCRIBE — PHASE 2: ENTERPRISE PRODUCT DESIGN & UI/UX ARCHITECTURE SPECIFICATION
**Document Version:** 2.0.0-PROD-SPEC  
**Classification:** Engineering Architecture & Industrial UX Specification  
**System Identity:** AirbandScribe — Aeronautical VHF Audio Transcription & Signal Analysis Workstation  
**Author:** Principal Product Designer & Design-System Architect  
**Status:** Approved for Implementation (Read-Only Specification)

---

## 1. PRODUCT DESIGN PHILOSOPHY & INDUSTRIAL AESTHETIC

### 1.1 Core Industrial Philosophy: Mission-Critical Aviation Tooling
AirbandScribe is engineered as an authoritative operational workstation for aviation audio transcription, acoustic signal processing, and air traffic telemetry extraction. It is modeled after the functional ergonomics of high-consequence industrial software: flight dispatch systems (Jeppesen / Boeing FliteDeck), air navigation console displays (Eurocontrol / FAA NextGen ERAM), and professional audio forensic workstations (iZotope RX, Steinberg WaveLab).

### 1.2 Anti-Patterns & Aesthetic Boundary Rules
To establish an authentic, professional tool that commands instant credibility during academic defense, government technical reviews, and engineering evaluations, AirbandScribe strictly rejects consumer SaaS and AI marketing gimmicks:
- **NO Sci-Fi / Cyberpunk Gimmicks:** No neon glowing borders (`box-shadow: 0 0 25px cyan`), no holographic grids, no faux scanlines, and no spaceship HUD overlays.
- **NO Generic AI Dashboard Clichés:** No gradient card borders, no floating glassmorphism blobs, no sparkles, and no generic purple-to-blue linear gradients.
- **NO Unnecessary Dark Mode Dominance:** Consumer apps overuse black backgrounds to hide layout flaws. AirbandScribe uses a **Light-First Design System** that maximizes typographical legibility and minimizes eye fatigue in well-lit operational offices.
- **Restrained Dark Instrument Canvas:** Dark surfaces (`#18272A`) are reserved strictly for technical visualizations (the oscilloscope waveform display and spectral waterfall) where physical emissive contrast directly aids acoustic waveform inspection.
- **Truth in Presentation:** Every displayed metric, frequency, callsign, and timestamp must originate from verified data. No mock telemetry chips, no decorative sine waves, and no placeholder dials.

---

## 2. DESIGN TOKENS & COLOR SYSTEM

### 2.1 Color Palette & Contrast Validation
The palette uses calibrated neutral stones, an authoritative aeronautical pine accent, restrained technical amber, and a high-contrast dark instrument surface.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AIRBANDSCRIBE COLOR SYSTEM                      │
├───────────────────┬───────────┬───────────────────┬────────────────────┤
│ Token Name        │ Hex Code  │ Semantic Role     │ Contrast (on BG)   │
├───────────────────┼───────────┼───────────────────┼────────────────────┤
│ --color-app-bg    │ #F1F2EF   │ Application Base  │ N/A (Canvas)       │
│ --color-surface-0 │ #FFFFFF   │ Primary Cards     │ 1.15:1 vs Canvas   │
│ --color-surface-1 │ #F8F9F7   │ Secondary Wells   │ 1.08:1 vs Canvas   │
│ --color-border    │ #DCE2DE   │ Hairline Dividers │ 1.3:1 (Structural) │
│ --color-border-sub│ #E9ECE8   │ Subtle Gridlines  │ 1.1:1              │
│ --color-text-0    │ #232D31   │ Primary Charcoal  │ 11.4:1 (WCAG AAA)  │
│ --color-text-1    │ #667278   │ Secondary Slate   │ 4.8:1 (WCAG AA)    │
│ --color-text-2    │ #939F9F   │ Muted Meta/Ticks  │ 3.1:1 (Non-body)   │
│ --color-pine-pri  │ #286B63   │ Primary Action    │ 5.4:1 (WCAG AA)    │
│ --color-pine-hov  │ #205951   │ Hover Action      │ 6.8:1 (WCAG AA)    │
│ --color-pine-sub  │ #EBF3F1   │ Pine Tint Surface │ 1.2:1              │
│ --color-amber-pri │ #B4874B   │ Caution/Warning   │ 4.6:1 (WCAG AA)    │
│ --color-amber-sub │ #FBF6EE   │ Amber Tint Well   │ 1.1:1              │
│ --color-danger    │ #B23A22   │ Error/Destructive │ 5.8:1 (WCAG AA)    │
│ --color-danger-sub│ #FDF2F0   │ Error Tint Surface│ 1.1:1              │
│ --color-inst-bg   │ #18272A   │ Dark Scope Well   │ 12.8:1 vs Canvas   │
│ --color-inst-grid │ #25393D   │ Scope Grid Lines  │ 1.8:1 vs Scope     │
│ --color-signal-grn│ #4B997E   │ Scope Waveform    │ 5.1:1 vs Scope     │
│ --color-signal-amb│ #E5A958   │ Scope Playhead/Tag│ 7.8:1 vs Scope     │
└───────────────────┴───────────┴───────────────────┴────────────────────┘
```

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Font Families & Roles
1. **Primary Interface Typeface:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
   - Used for all interface chrome, navigational labels, modal dialogs, status text, and prose transcripts.
   - Enforces sentence case for clarity; avoids gratuitous all-caps.
2. **Technical Telemetry & Audio Typeface:** `JetBrains Mono`, `IBM Plex Mono`, `ui-monospace`, `Consolas`, `monospace`.
   - Used exclusively for timestamps (`01:06.34`), VHF radio frequencies (`126.14 MHz`), ICAO callsigns (`UAL442`), runway designators (`RWY 01R`), sampling rates (`16,000 Hz`), and buffer durations.

### 3.2 Typographic Hierarchy Scale
```
Scale Token      Size      Weight    Line Height   Letter Spacing   Usage Example
─────────────────────────────────────────────────────────────────────────────────────────────
--text-2xs       10px      500       14px          +0.04em          Time ticks, micro-chips
--text-xs        11px      500/600   16px          +0.02em          Telemetry labels, tags
--text-sm        12px      400/500   18px          0.00em           Secondary meta, logs
--text-base      13px      400/500   20px          -0.01em          Body copy, strip transcript
--text-md        15px      600       22px          -0.015em         Section titles, strip callsign
--text-lg        18px      600       24px          -0.02em          Modal headings, panel titles
--text-xl        22px      700       28px          -0.025em         Application brand, hero metrics
```

---

## 4. SPACING, GRID & ELEVATION SYSTEM

### 4.1 4px / 8px Base Grid
- Spacing is strictly calculated using multiples of 4px: `4px` (`--space-1`), `8px` (`--space-2`), `12px` (`--space-3`), `16px` (`--space-4`), `24px` (`--space-6`), `32px` (`--space-8`), `48px` (`--space-12`).

### 4.2 Elevation & Border Treatment
- AirbandScribe uses **crisp, hairline borders** (`1px solid var(--color-border)`) rather than diffuse drop shadows.
- Primary Surfaces (`--color-surface-0`): `box-shadow: 0 1px 3px rgba(35, 45, 49, 0.04)`.
- Hover/Active Cards: `box-shadow: 0 2px 6px rgba(35, 45, 49, 0.08)`.
- Modal Overlay: `background: rgba(24, 39, 42, 0.60)` with `backdrop-filter: blur(2px)`.

---

## 5. COMPONENT LIBRARY SPECIFICATION

```
Component           Resting State              Hover / Active State         Disabled State
─────────────────────────────────────────────────────────────────────────────────────────────
Button Primary      BG: #286B63, Text: #FFF    BG: #205951, Text: #FFF      BG: #DCE2DE, Text: #939F9F
Button Secondary    BG: #FFFFFF, Border: #DCE  BG: #F8F9F7, Border: #B0BBB5 BG: #F8F9F7, Text: #939F9F
Button Destructive  BG: #FDF2F0, Border: #B23  BG: #B23A22, Text: #FFF      Opacity: 0.5
Segment Card        BG: #FFFFFF, Border: #DCE  BG: #EBF3F1, Border: #286B63 Opacity: 0.7
Input / Select      BG: #FFFFFF, Border: #DCE  Border: #286B63, 1px Pine    BG: #F8F9F7, Readonly
Badge / Tag         BG: #F1F2EF, Text: #232D   Border: 1px solid #DCE2DE    Opacity: 0.5
Scope Well          BG: #18272A, Border: #253  Border: #395257              N/A
```

---

## 6. APPLICATION NAVIGATION & GLOBAL HEADER

### 6.1 Restrained Top Header Architecture
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [✈ AIRBANDSCRIBE]  v2.4.0-stable   [● CORE ENGINE READY]   [DEV: CPU-int8]      [WORKSTATION]  [RECORDINGS]  [SIGNAL LAB]│
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
1. **Brand Mark:** Minimalist aeronautical vector glyph (`✈`) + "AirbandScribe" in `16px / 700` Inter Charcoal (`#232D31`).
2. **Build Stamp:** Subdued badge `v2.4.0` (`11px`, `--color-text-1`).
3. **Engine Telemetry Chip:** Genuine health poll to `/api/health` displaying active backend status (`● ENGINE ONLINE` in `#4B997E`).
4. **Compute Badge:** Live runtime indicator (`CPU / int8` or `CUDA / fp16`).
5. **Workspace Navigation Tabs:**
   - **Workstation:** Live ingestion, waveform oscilloscope, progress strips, telemetry matrix.
   - **Recordings:** Searchable flight recorder logbook with audio archive and execution metrics.
   - **Signal Lab:** Interactive educational DSP laboratory explaining sampling, filtering, and VAD.

---

## 7. WORKSTATION SECTION-BY-SECTION WIREFRAME (1440 × 900)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: AirbandScribe v2.4.0        Engine: Online (CPU-int8)             [Workstation]  [Recordings (3)]  [Signal Lab]   │
├───────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┤
│ 1. INGESTION & DSP PIPELINE                                   │ 2. FLIGHT TELEMETRY MATRIX                               │
│ [ Drop VHF Audio File (WAV/MP3/M4A) or Browse ]               │ ┌───────────────┬───────────────┬───────────────┬──────┐ │
│ File: KDCA-TWR-Nov-2026.wav (5m 22s, 16kHz Mono)              │ │ CALLSIGNS (4) │ RUNWAYS (2)   │ HEADINGS (3)  │ FL/A │ │
│ Filters: [☑ 300-3400Hz Bandpass]  [☑ Spectral Noise Gate]     │ │ UAL442 DAL108 │ RWY 01, RWY 19│ HDG 270, 090  │ 4000 │ │
│ Model: [Whisper Base.en ▾]  [▶ TRANSCRIBE & EXTRACT TELEMETRY]│ └───────────────┴───────────────┴───────────────┴──────┘ │
├───────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┤
│ 3. WAVEFORM & ACOUSTIC OSCILLOSCOPE (Dark Instrument Surface #18272A)                                                    │
│ [CLEANED VHF ◉] [BANDPASS RAW ○]    [⏮] [◀ -5s] [▶ PLAY] [▶ +5s] [⏭]   01:06.34 / 05:22.62   Speed: [1.0x ▾]  [⟲ Loop]    │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 00:00        00:30        01:00        01:30        02:00        02:30        03:00        03:30        04:00        │ │
│ │ ───██──████───███───██───█████────|────────────────████───██████────██───█████────████───██───████───███───────│ │
│ │    [Seg 1]    [Seg 2]    [Active]  ▲ Playhead (01:06)                                                                │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┤
│ 4. FLIGHT PROGRESS STRIPS (25 Transmissions Detected)         │ 5. FLIGHT RECORDER LOGBOOK (3 Sessions Cached)           │
│ Search: [ 🔍 Filter callsign, runway, keyword... ] [SRT][JSON]│ [ ↻ Sync ]                                               │
│ ┌───────────────────────────────────────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │
│ │ #12  01:05.40 -> 01:06.48  (1.08s)  Conf: 94%   [📋 Copy] │ │ │ KDCA-Heli-Nov-13-2026.wav   05:22  CPU   [✓] [🗑 DEL] │ │
│ │ "United 442, contact Potomac Departure on 126.14."        │ │ │ Harvard-Aviation.wav        00:18  CPU   [✓] [🗑 DEL] │ │
│ │ Entities: [CALLSIGN: UAL442] [FREQ: 126.14]               │ │ │ sample_atc.wav              00:13  CPU   [✓] [🗑 DEL] │ │
│ ├───────────────────────────────────────────────────────────┤ │ └──────────────────────────────────────────────────────┘ │
│ │ #13  01:08.12 -> 01:11.80  (3.68s)  Conf: 91%   [📋 Copy] │ │ 6. SESSION AUDIT TRAIL                                 │
│ │ "Turn left heading 090, climb and maintain 4000."         │ │ File Size: 10.3 MB | Ingestion: 16,000 Hz Mono         │
│ │ Entities: [HDG: 090] [ALT: 4000 FT]                       │ │ Preprocessing: 420ms | Inference Time: 3.14s           │
│ └───────────────────────────────────────────────────────────┘ │ Real-Time Factor (RTF): 0.0097x (103x faster than real) │
└───────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 8. WAVEFORM OSCILLOSCOPE INTERACTION SPECIFICATION

### 8.1 Dual-Layer Canvas Design
1. **Background Grid Layer:** `#18272A` background with `#25393D` calibrated time grid ticks every 10 seconds and sub-ticks every 2 seconds.
2. **True PCM Decimated Envelope:** Rendered via Web Audio API `AudioBuffer` or backend peak array (1000 pairs of min/max values). Color: `#4B997E` (Signal Green) with `#286B63` RMS inner fill.
3. **VAD Speech Boundary Overlays:** Detected speech segments are shaded with `rgba(75, 153, 126, 0.15)` vertical bands with a crisp 1px top marker.
4. **Scrubbing Playhead:** Vertical 2px amber cursor (`#E5A958`) with a high-contrast time indicator floating above it.

### 8.2 A/B Audio Comparison Switch
- A hardware-styled toggle switch allowing the user to toggle between:
  - **A (Cleaned VHF):** Post-Butterworth and spectral-subtracted audio stream.
  - **B (Bandpass Raw):** Pre-subtraction bandpass audio stream.
- Switching does **not** interrupt playback position; audio element smoothly switches source buffers while maintaining identical timestamp.

---

## 9. TRANSCRIPT & FLIGHT PROGRESS STRIP ERGONOMICS

### 9.1 Container-Relative Synchronized Auto-Scroll
- **Fixed Root Cause:** The previous auto-scroll error calculated `elem.offsetTop` relative to the document body, causing a jump down to 03:28 when audio was at 01:06.
- **Specification:** Auto-scroll must compute bounds relative to the `.strips-scroll-container`:
  ```javascript
  const container = containerRef.current;
  const activeStrip = container.querySelector(`[data-index="${activeIndex}"]`);
  if (activeStrip) {
    const cTop = container.getBoundingClientRect().top;
    const sTop = activeStrip.getBoundingClientRect().top;
    const diff = sTop - cTop;
    if (diff < 40 || diff > container.clientHeight - 80) {
      container.scrollTo({ top: container.scrollTop + diff - 80, behavior: 'smooth' });
    }
  }
  ```

### 9.2 Strip Card Layout
Each transmission segment is encapsulated in an authentic strip design:
- Left margin: Monospace index (`#12`) and exact range `[01:05.40 - 01:06.48]`.
- Center content: Clean high-contrast transcript text (`#232D31`, 13px Inter).
- Aviation entity pills: Subdued badges highlighting recognized callsigns (`UAL442` in Pine), runways (`RWY 01` in Charcoal), and frequencies (`126.14` in Slate).
- Right margin: Action button (`📋 CPY`) providing instant 1-click clipboard copy of raw and normalized text.

---

## 10. RECORDING LIBRARY & LOGBOOK SPECIFICATION

### 10.1 Structured Column Layout
- Previous issue: Raw red cross marks (`✕`) misled users into thinking transcripts had failed.
- Redesigned table layout:
  - **Recording Identifier:** Monospace filename with duration badge (`05:22`).
  - **Timestamp:** ISO upload date formatted cleanly (`2026-11-18 20:45 UTC`).
  - **Processing Badge:** Clean status badge `[✓ READY]` (`#4B997E`) or `[● PROCESSING]` (`#B4874B`).
  - **Actions:** Discrete action button `[Load]` and a labeled destructive button `[🗑 DEL]`.

### 10.2 Modal Delete Confirmation
- To prevent accidental data loss, clicking `[🗑 DEL]` triggers a modal dialog:
  - Header: "Confirm Logbook Entry Deletion"
  - Body: "Are you sure you want to delete recording **KDCA-Heli-Nov-13-2026.wav**? This removes the audio cache and extracted telemetry from the local database."
  - Buttons: `[Cancel]` (Secondary) and `[Confirm Delete]` (Destructive `#B23A22`).

---

## 11. PRESENTATION & ACADEMIC EVALUATION MODE

### 11.1 Purpose & User Flow
When demonstrating AirbandScribe in academic, defense, or industry reviews, presenters need a distraction-free, full-screen walkthrough mode that guides the audience through the signal ingestion, filtering, and transcription pipeline.

### 11.2 Presentation Mode Blueprint
- Accessible via a prominent `[ 🗖 PRESENTATION MODE ]` button in the header.
- Expands to a clean full-screen layout (F11 / ESC to exit).
- Automatically loads a gold-standard reference benchmark (e.g., `KDCA-Heli-Nov-13-2026.wav`).
- Features a 4-step progressive disclosure bar:
  1. **Acoustic Ingestion:** Visualizes raw 16 kHz sample ingestion and 300–3400 Hz voiceband filtering.
  2. **Spectral Noise Gating:** Displays side-by-side noise reduction spectrograms.
  3. **Silero VAD Chunking:** Demonstrates 30s sliding windows with 5s overlap and timestamp realignment.
  4. **Telemetry Extraction:** Displays extracted flight numbers, runways, and frequencies alongside normalized readouts.

---

## 12. SIGNAL SCIENCE LAB SPECIFICATION

### 12.1 Interactive Mathematical DSP Explainer
The Signal Lab tab transforms AirbandScribe from a simple transcription tool into an authoritative signal processing workstation. It provides clear visual explanations of the underlying mathematical principles:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIGNAL PROCESSING SCIENCE & MATHEMATICAL PARAMETERS                                                    │
├─────────────────────────────────────┬────────────────────────────────────┬─────────────────────────────┤
│ 1. SAMPLING THEOREM (NYQUIST)       │ 2. BUTTERWORTH IIR BANDPASS        │ 3. SILERO VAD & CHUNKING    │
│ • Sample Rate: 16,000 samples/sec   │ • Order: 5th-Order Digital IIR     │ • Frame Size: 512 samples   │
│ • Sample Interval: 62.5 µs (1/16k)  │ • Passband: 300 Hz – 3,400 Hz      │ • Frame Duration: 32.0 ms   │
│ • Nyquist Limit (f_N): 8,000 Hz     │ • Attenuation: -30 dB/decade       │ • Window Length: 30 seconds │
│ • 30-Second Chunk: 480,000 samples  │ • Normalized Cutoff: W_n=[.037,.42]│ • Window Overlap: 5 seconds │
│ • 5-Second Overlap: 80,000 samples  │ • Filter Type: Zero-phase filtfilt │ • Overlap Samples: 80,000   │
└─────────────────────────────────────┴────────────────────────────────────┴─────────────────────────────┘
```

---

## 13. RESPONSIVE DESIGN SPECIFICATION

| Breakpoint | Target Screen | Layout Strategy |
| :--- | :--- | :--- |
| **>= 1440px** | 1440×900 Laptop / 1920×1080 Desktop | 2-column layout (Left: Ingestion & Strips, Right: Telemetry & Logbook) with full-width dark instrument waveform console. |
| **1280px - 1439px** | Compact Laptop | Waveform height compresses from 140px to 110px. Telemetry matrix switches from 4 columns to 2x2 grid. |
| **1024px - 1279px** | Tablet Landscape | Single-column stacked workflow. Waveform retains full width. Progress strips and Logbook sit on tabbed container. |
| **768px - 1023px** | Tablet Portrait | Ingestion panel collapses into collapsible drawer. Strips take primary vertical view. Touch targets expand to 44px minimum. |
| **< 768px** | 390px Mobile | Single-column linear stack. Waveform provides pinch-to-zoom or fixed 30-second viewport window. Zero horizontal overflow. |

---

## 14. FIRST VIEWPORT AT 1440 × 900: SENSORY & OPERATIONAL FEEL

### 14.1 Visual Composition
At standard 1440 × 900 resolution (the dominant resolution of engineering laptops), the user sees **the entire operational pipeline without scrolling**:
1. The slim 48px header sits at the top with quiet confidence: the muted charcoal text, green health indicator, and crisp version number.
2. The ingestion panel and telemetry summary occupy the top 180px, displaying real file statistics and callsign counts.
3. The dark instrument oscilloscope canvas (`#18272A`) commands the visual center (130px height), glowing with a subdued, crisp `#4B997E` signal wave that looks like a genuine hardware oscilloscope.
4. The lower 480px houses the dual-column workspace: active Flight Progress Strips on the left, and the Flight Recorder Logbook on the right.

### 14.2 Operational "Feel"
The application feels **calm, precise, tactile, and dependable**:
- Interactions are instantaneous; state transitions feel mechanical and grounded.
- Audio seeking snaps cleanly to transmission boundaries.
- Typography is razor sharp, with zero visual noise or cartoonish rounding.
- The user feels like an aerospace engineer sitting in front of a calibrated signal workstation, not a consumer testing an AI prototype.

---

## 15. ACCESSIBILITY & KEYBOARD SYSTEM

- **WCAG 2.1 AA Compliance:** Minimum 4.5:1 text-to-background contrast on all body copy and controls (charcoal `#232D31` achieves 11.4:1 on white).
- **2px Focused State:** All interactive elements feature a visible 2px solid `#286B63` focus ring with a 2px offset.
- **Keyboard Shortcuts (Aviation Workstation):**
  - `Space`: Play / Pause audio playback.
  - `Left / Right Arrow`: Jump backward / forward 5 seconds.
  - `A`: Toggle between Cleaned VHF and Bandpass Raw audio.
  - `L`: Toggle loop playback for selected transmission segment.
  - `Esc`: Dismiss modals or exit Presentation Mode.

---

## 16. PHASE 3 IMPLEMENTATION ROADMAP & ACCEPTANCE CRITERIA

### 16.1 Phased Implementation Order
1. **Phase 3A: Design Token & Global Theme Refactor**
   - Implement CSS variables in `frontend/src/index.css`.
   - Purge glowing cyan, neon borders, and unnecessary dark card styles.
2. **Phase 3B: Header & Workspace Navigation**
   - Implement the restrained header with live health polling and navigation tabs.
3. **Phase 3C: True Audio Waveform & Scope Canvas**
   - Upgrade waveform component to render real audio peaks on `#18272A` canvas with calibrated time ruler.
4. **Phase 3D: Telemetry Matrix & Progress Strips**
   - Restructure flight progress strips with container-relative auto-scroll and 1-click clipboard copy.
5. **Phase 3E: Logbook Redesign & Modal Deletion**
   - Implement structured logbook table with `[✓ READY]` badges and delete confirmation modal.
6. **Phase 3F: Signal Lab & Presentation Mode**
   - Build interactive Signal Lab tab and full-screen Presentation Mode.

### 16.2 Acceptance Criteria
- [ ] Interface defaults to Light-First (`#F1F2EF` base, `#FFFFFF` cards, `#232D31` text).
- [ ] Dark surface `#18272A` is isolated to the oscilloscope canvas and spectrogram.
- [ ] Zero simulated/mock telemetry: empty states are clean and truthful.
- [ ] Audio waveform accurately reflects true audio peaks and seeks without lag.
- [ ] Synchronized auto-scroll correctly tracks the active strip without overshooting.
- [ ] All buttons have real handlers; destructive actions require confirmation.
- [ ] Zero code modified until Phase 3 kickoff authorization.

