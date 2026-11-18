# ✈️ AirbandScribe

### High-Precision Aeronautical VHF Speech Intelligence & Transcription Workstation

![CI Status](https://img.shields.io/badge/CI-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Aviation](https://img.shields.io/badge/Band-VHF%20118--137%20MHz-f59e0b?style=for-the-badge)

**AirbandScribe** is an end-to-end aeronautical speech signal intelligence and automated transcription platform built specifically for noisy, fast-paced VHF radio communications between air traffic controllers and pilots.

Equipped with 5th-order Butterworth bandpass filtering, spectral noise gating, Silero Voice Activity Detection (VAD), overlapping window chunking, domain-specific ICAO phraseology normalization, and an aerospace flight progress strip console.

---

## 📑 Table of Contents
- [✨ Core Capabilities](#-core-capabilities)
- [📡 Signal Processing Architecture](#-signal-processing-architecture)
- [🛫 ATC Phraseology Engine](#-atc-phraseology-engine)
- [🖥️ Avionics Flight Console](#️-avionics-flight-console)
- [🚀 Quickstart](#-quickstart)
  - [Option A: One-Click Launch (Windows / Linux)](#option-a-one-click-launch-windows--linux)
  - [Option B: Docker Compose (CPU / GPU)](#option-b-docker-compose-cpu--gpu)
  - [Option C: Manual Development Setup](#option-c-manual-development-setup)
- [🕹️ REST API Reference](#️-rest-api-reference)
- [🧪 Test Suite & Verification](#-test-suite--verification)
- [📂 Project Directory Structure](#-project-directory-structure)

---

## ✨ Core Capabilities

- **Acoustic Noise Reduction**: Isolates the human vocal tract (100 Hz – 8,000 Hz) using Butterworth bandpass filtering and removes background carrier hiss via spectral gating.
- **Silero Voice Activity Detection (VAD)**: Accurately identifies speech bursts and suppresses dead air.
- **Overlapping Window Chunking**: Automatically slices long audio recordings (>60s) into 30-second windows with 5-second overlapping boundaries, deduplicating spoken phrases at stitching seams.
- **ICAO / FAA Phraseology Normalization**: Automatically standardizes spoken aviation numbers into standard operational formats (`"runway two seven left"` → `Runway 27L`, `"heading two niner zero"` → `Heading 290`, `"flight level three two zero"` → `FL320`).
- **Aerospace Telemetry Console**: Features an interactive HTML5 audio waveform, Zulu UTC clock, A/B audio channel switching (Cleaned vs Filtered), callsign detection, and multi-format exports (.SRT, .VTT, .JSON, .TXT).
- **Dual Hardware Execution**: Automatically detects and leverages NVIDIA CUDA or Intel/AMD CPU AVX2 acceleration.

---

## 📡 Signal Processing Architecture

```text
[ Raw VHF Aeronautical Audio Input (.wav, .mp3, etc.) ]
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Stage 1: Acoustic Preprocessing & Noise Cancellation    │
 │  ├── 5th-Order Butterworth Bandpass (100 Hz - 8,000 Hz) │
 │  └── Spectral Gating Noise Reduction (noisereduce)      │
 └─────────────────────────────────────────────────────────┘
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Stage 2: Temporal Chunking & Voice Activity Detection   │
 │  ├── 30-second chunks with 5-second overlap windows     │
 │  └── Silero VAD v6.2 speech timestamp boundary gating   │
 └─────────────────────────────────────────────────────────┘
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Stage 3: High-Speed GGUF Inference Engine               │
 │  ├── Beam Search (size 5) + Forced English Tokenizer    │
 │  └── ICAO Hotword Biasing (runway, heading, ils, dme)   │
 └─────────────────────────────────────────────────────────┘
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Stage 4: ATC Phraseology Normalizer & Stitching         │
 │  ├── Word-to-number phonetic mapping (niner -> 9)       │
 │  ├── Callsign, Runway, Heading, FL formatting           │
 │  └── Seam deduplication across overlapping segments     │
 └─────────────────────────────────────────────────────────┘
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Stage 5: Avionics Flight Deck Console & API Delivery    │
 │  ├── Interactive time-domain waveform & scrubber        │
 │  ├── Synchronized Flight Progress Strips                │
 │  └── Multi-format exports: .SRT, .VTT, .JSON, .TXT      │
 └─────────────────────────────────────────────────────────┘
```

---

## 🛫 ATC Phraseology Engine

Aviation speech uses strict phonetic conventions. AirbandScribe normalizes raw spoken sequences into standardized flight dispatch notation:

| Spoken Pilot / Controller Audio | AirbandScribe Normalized Output |
| :--- | :--- |
| `"cleared i l s runway two seven left approach"` | `cleared ILS runway 27L approach` |
| `"turn right heading two niner zero maintain speed"` | `turn right heading 290 maintain speed` |
| `"climb and maintain flight level three two zero"` | `climb and maintain FL320` |
| `"contact tower on one one niner point one"` | `contact tower on 119.1` |
| `"intercept the localiser cleared ils approach"` | `intercept the localizer cleared ILS approach` |
| `"american seven thirty six turn left heading three six zero"` | `American 736 turn left heading 360` |

---

## 🖥️ Avionics Flight Console

The front-end is crafted as a high-density aerospace workstation:

- **Zulu UTC Clock**: Real-time Greenwich Mean Time reference.
- **Interactive Scrubber**: Click anywhere on the audio waveform to immediately seek to that millisecond.
- **Flight Progress Strips**: Color-coded tokens for clearances (amber), runways (emerald), altitudes (cyan), headings (tangerine), and callsigns (yellow).
- **A/B Audio Toggle**: Instantly compare denoised audio against bandpass audio.
- **Keyboard Shortcuts**:
  - `SPACE` — Play / Pause
  - `←` / `→` — Seek ±3 seconds
  - `R` — Replay active transmission
  - `D` — Toggle Denoised / Filtered channel
  - `M` — Mute / Unmute

---

## 🚀 Quickstart

### Option A: One-Click Launch (Windows / Linux)

On Windows:
```cmd
run_all.bat
```

On Linux / macOS:
```bash
chmod +x run_all.sh
./run_all.sh
```

- **Avionics Web Console**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Core API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Option B: Docker Compose (CPU / GPU)

**CPU Mode (Default)**:
```bash
docker compose up --build
```

**GPU Mode (NVIDIA CUDA)**:
```bash
docker compose --profile gpu up --build
```

After initialization, navigate to `http://localhost:8000`.

---

### Option C: Manual Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Divyanshu1305/ATC-Recording-Transcription.git AirbandScribe
   cd AirbandScribe
   ```

2. **Set up Python Virtual Environment**:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux:
   source venv/bin/activate

   pip install -r requirements_transcribe.txt
   ```

3. **Start the Backend**:
   ```bash
   python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🕹️ REST API Reference

### Health & Capabilities Check
```http
GET /api/status
```

Response:
```json
{
  "status": "online",
  "service": "AirbandScribe VHF Intelligence Engine",
  "version": "1.2.0",
  "codename": "STARS-ECHELON",
  "airband": "VHF AM 118.000 - 136.975 MHz",
  "hardware": {
    "cuda_available": false,
    "cpu_available": true,
    "speech_model_ready": true
  }
}
```

### Transcribe VHF Audio
```http
POST /transcribe
```

Parameters (Multipart Form-Data):
- `file`: Audio file (`.wav`, `.mp3`, etc.)
- `apply_noise_removal`: `true` | `false` (default: `true`)
- `noise_reduction`: float between `0.0` and `1.0` (default: `0.75`)
- `device`: `"cpu"` | `"cuda"` (default: `"cpu"`)

Example `cURL` request:
```bash
curl -X POST "http://127.0.0.1:8000/transcribe" \
  -F "file=@test-files/sample_atc.wav" \
  -F "apply_noise_removal=true" \
  -F "device=cpu"
```

### Retrieve Past Transcriptions
```http
GET /transcriptions?page=1&limit=10&search=runway
```

---

## 🧪 Test Suite & Verification

AirbandScribe includes a 10-test unit test suite covering phraseology normalization, overlapping audio chunking, SQLite persistence, and API integration.

To run tests:
```bash
python test_suite.py
```

Expected output:
```text
..........
----------------------------------------------------------------------
Ran 10 tests in 0.039s

OK
```

---

## 📂 Project Directory Structure

```text
AirbandScribe/
├── app.py                      # FastAPI REST server & SPA static distributor
├── atc_normalizer.py           # Domain phraseology parser & normalizer
├── audio_chunker.py            # Overlapping chunker & overlap deduplicator
├── database.py                 # SQLite persistence & flight audit trail
├── transcribe_atc.py           # Main DSP pipeline & CrispASR wrapper
├── test_suite.py               # Unit & integration test suite
├── Dockerfile                  # Container definition for CPU deployment
├── docker-compose.yml          # Multi-profile orchestration (CPU/GPU)
├── requirements_transcribe.txt # Pinned Python dependencies
├── run_all.bat / run_all.sh    # One-click full stack launchers
├── bin/
│   └── cpu/                    # Native CrispASR CPU binary
├── models/
│   └── ggufs/                  # GGUF Speech Recognition weights
└── frontend/                   # React 18 + Vite Avionics Web Console
    ├── index.html              # HTML5 entrypoint with aviation typography
    ├── vite.config.js          # Reverse-proxy dev configuration
    └── src/
        ├── App.jsx             # Root layout container
        └── components/
            └── transcribe.jsx  # Interactive Avionics Flight Console
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
