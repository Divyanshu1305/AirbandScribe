# 🎧 Air Traffic Control (ATC) ASR Transcription Pipeline

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![CUDA / GPU Support](https://img.shields.io/badge/CUDA%20%2F%20GPU-Supported-76B900?style=for-the-badge&logo=nvidia&logoColor=white)

An end-to-end, high-performance Automatic Speech Recognition (ASR) system tailored specifically for **Air Traffic Control (ATC)** audio communications. This project integrates acoustic preprocessing (bandpass filtering and spectral noise reduction), robust Voice Activity Detection (Silero VAD), overlapping chunking for long recordings, domain-specific hotword biasing, an ATC phraseology normalizer, and a fast inference engine (`crispasr.exe`). It provides both a **FastAPI** backend server with SQLite persistence and a modern **React/Vite** web frontend.

---

## 📑 Table of Contents
- [✨ Architecture & Workflow](#-architecture--workflow)
- [✨ Key Features](#-key-features)
- [🚀 Quickstart: Launch with One Command](#-quickstart-launch-with-one-command)
  - [Option A: One-Click Launch Script (Local Windows/Linux)](#option-a-one-click-launch-script)
  - [Option B: Docker Compose](#option-b-docker-compose)
  - [Option C: Separate Backend & Frontend (Development Mode)](#option-c-separate-backend--frontend)
- [🛠️ Detailed Prerequisites & Setup](#️-detailed-prerequisites--setup)
  - [1. Crisp ASR Executable](#1-crisp-asr-executable)
  - [2. Silero VAD Model](#2-silero-vad-model)
  - [3. GGUF Speech Model](#3-gguf-speech-model)
  - [4. Python Virtual Environment](#4-python-virtual-environment)
- [🕹️ Usage & API Guide](#-usage--api-guide)
  - [REST API Endpoints](#rest-api-endpoints)
  - [Example `cURL` Transcription Request](#example-curl-transcription-request)
  - [CLI Direct Execution](#cli-direct-execution)
- [📂 Project Structure](#-project-structure)
- [❓ Troubleshooting & Support](#-troubleshooting--support)

---

## ✨ Architecture & Workflow

Aviation audio is typically plagued by narrow radio bandwidth, static, and rapid multi-speaker speech. This pipeline solves these challenges by chaining distinct stages:

```
[Raw ATC Audio Input (.wav, .mp3, etc.)]
                 │
                 ▼
[Stage 1: Preprocessing & Noise Cleaning]
  ├── Butterworth Bandpass Filter (100Hz - 8000Hz)
  └── Spectral Gating Noise Reduction (noisereduce coefficient: 0.75)
                 │
                 ▼
[Stage 2: Voice Activity Detection & Overlapping Chunking]
  ├── Long recording detection (>60s) with 30s chunks & 5s overlap
  └── Silero VAD speech timestamp isolation & boundary protection
                 │
                 ▼
[Stage 3: Fast ASR Inference Engine (crispasr.exe)]
  ├── Beam Search (size 5) + Forced English Language (-l en)
  └── Domain Biasing (Hotwords: ils, dme, localizer, runway, heading, etc.)
                 │
                 ▼
[Stage 4: ATC Phraseology Normalizer & Overlap Deduplication]
  ├── Runway notation (e.g., "Runway 27L")
  ├── Headings (e.g., "heading 270") & Flight Levels ("FL350")
  └── Overlap text stitching without repeated words
                 │
                 ▼
[Output: Structured JSON + SQLite Persistence + Interactive React Console]
```

---

## ✨ Key Features

- **Acoustic Noise Reduction**: Filters frequencies outside human speech bounds (100Hz–8000Hz) using Butterworth bandpass filtering and suppresses background radio static with spectral gating (`noisereduce`).
- **Overlapping Chunk Processing**: Automatically breaks long audio files (>60s) into 30-second chunks with 5-second overlaps, adjusting segment timestamps and deduplicating boundary text so no transmissions are dropped.
- **ATC Terminology Normalization & Highlighting**:
  - Automatically standardizes ATC terms: runways (e.g. `Runway 27L`), headings (e.g. `heading 270`), altitudes/flight levels (e.g. `FL350`), frequencies (e.g. `119.1`), and navigation aids (`ILS`, `DME`, `VOR`).
  - Interactive color-coded token highlighting in the web UI for verbs, runways, altitudes, headings, and nav aids.
- **SQLite History & Persistence**: Saves every transcription with metadata including filename, time, duration, processing speed, compute device (`cpu` or `cuda`), and intermediate audio paths (`transcriptions.db`). Includes pagination and deletion.
- **Interactive Audio Timeline & Chunk Inspector**: Synchronized audio player with waveform scrubber, active transmission HUD, and chunk-by-chunk playback comparison (filtered vs denoised audio).
- **Separated Backend & Frontend Architecture**:
  - Backend: FastAPI on port 8000 (Swagger docs at `/docs`).
  - Frontend: React + Vite on port 3000 (proxies to backend).
  - Can also run compiled from a single port (8000) via FastAPI static serving.

---

## 🚀 Quickstart: Launch with One Command

### Option A: One-Click Launch Script

#### On Windows:
Double click or run:
```cmd
run_all.bat
```
*(Starts the FastAPI backend on port 8000 and the React frontend on port 3000 in separate windows.)*

#### On Linux / macOS:
```bash
chmod +x run_all.sh
./run_all.sh
```

---

### Option B: Docker Compose

Launch the complete self-contained container stack with one command:

```bash
# CPU mode (default)
docker compose up

# Or GPU accelerated mode (NVIDIA CUDA)
docker compose --profile gpu up
```
Open **`http://localhost:8000`** in your browser.

---

### Option C: Separate Backend & Frontend (Development Mode)

#### 1. Start the Backend (Terminal 1)
```bash
# Windows
venv\Scripts\activate
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Linux / Mac
source venv/bin/activate
python3 -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Start the Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🛠️ Detailed Prerequisites & Setup

### 1. Crisp ASR Executable
Place the appropriate binary into `bin/cpu/` or `bin/cuda/`:
- **Windows CPU**: [crispasr-windows-x86_64-cpu-legacy.zip](https://github.com/CrispStrobe/CrispASR/releases/download/v0.8.10/crispasr-windows-x86_64-cpu-legacy.zip) -> extract `crispasr.exe` into `bin/cpu/crispasr.exe`.
- **Windows GPU**: [crispasr-windows-x86_64-cuda.zip](https://github.com/CrispStrobe/CrispASR/releases/download/v0.8.10/crispasr-windows-x86_64-cuda.zip) -> extract `crispasr.exe` into `bin/cuda/crispasr.exe`.
- **Linux CPU**: [crispasr-linux-x86_64.tar.gz](https://github.com/CrispStrobe/CrispASR/releases/download/v0.8.10/crispasr-linux-x86_64.tar.gz) -> extract into `bin/cpu/crispasr`.

*(The pipeline automatically searches `bin/cpu/` if no discrete GPU is found.)*

### 2. Silero VAD Model
Download the Silero VAD binary into `.cache/crispasr/`:
```bash
curl -L -o ~/.cache/crispasr/ggml-silero-v6.2.0.bin https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin
```

### 3. GGUF Speech Model
Place your speech model inside `models/ggufs/speech-model.gguf`:
```bash
curl -L -o models/ggufs/speech-model.gguf https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

### 4. Python Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements_transcribe.txt
```

---

## 🕹️ Usage & API Guide

### REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/transcribe` | Upload audio file (`file`, `device`, `apply_noise_removal`, `noise_reduction`, `save_intermediate`) |
| `GET` | `/transcriptions` | List past transcriptions with pagination (`?page=1&limit=10&search=...`) |
| `GET` | `/transcriptions/{id}` | Retrieve full details, segments, and audio chunk paths for an ID |
| `DELETE` | `/transcriptions/{id}` | Delete a past transcription record and clean up stored files |
| `GET` | `/api/status` | Health check, device capabilities, and pipeline status |
| `GET` | `/output/{file}` | Access intermediate filtered/denoised audio and chunks |

Interactive Swagger documentation is available at: **`http://127.0.0.1:8000/docs`**.

### Example `cURL` Transcription Request

```bash
curl -X POST "http://127.0.0.1:8000/transcribe" \
     -F "file=@test-files/sample_atc.wav" \
     -F "device=cpu" \
     -F "apply_noise_removal=true" \
     -F "noise_reduction=0.75" \
     -F "save_intermediate=true"
```

### CLI Direct Execution

You can run the pipeline directly via terminal on any audio file:
```bash
python transcribe_atc.py test-files/sample_atc.wav --device cpu --noise_reduction 0.75
```

---

## 📂 Project Structure

```
├── app.py                     # FastAPI server with REST endpoints & SPA serving
├── transcribe_atc.py          # Core ASR pipeline (Filter, Denoise, VAD, Inference)
├── audio_chunker.py           # Overlapping chunk generator & boundary deduplicator
├── atc_normalizer.py          # Domain-specific terminology & phraseology standardizer
├── database.py                # SQLite persistence layer (transcriptions.db)
├── run_transcription.py       # Standalone CLI transcription engine with auto-scaling
├── requirements_transcribe.txt# Python dependencies
├── docker-compose.yml         # Compose configuration for CPU and GPU containers
├── docker/
│   ├── Dockerfile.cpu         # Self-contained CPU Docker image
│   └── Dockerfile.gpu         # Self-contained CUDA Docker image
├── run_all.bat / run_all.sh   # One-click launch scripts (Backend + Frontend)
├── run_backend.bat / .sh      # Backend launch script
├── run_frontend.bat / .sh     # Frontend launch script
├── frontend/                  # React + Vite web console
│   ├── src/components/transcribe.jsx # Main interactive ATC console
│   └── dist/                  # Pre-compiled static assets
├── bin/                       # Inference executables (bin/cpu and bin/cuda)
├── models/ggufs/              # GGUF speech models
└── output/                    # Filtered, denoised, and intermediate audio chunks
```

---

## ❓ Troubleshooting & Support

- **Audio Playback in Browser**: The web console provides native audio playback for both the full filtered/denoised files and individual 30s chunks. Ensure audio files are accessible under `output/`.
- **CPU vs GPU Selection**: If `device="cuda"` is requested on a system without discrete NVIDIA hardware, the pipeline automatically falls back to CPU execution and accurately tags the record as `cpu`.
- **Long Audio Files**: Recordings over 60 seconds are automatically processed in overlapping chunks to ensure high accuracy without memory overflow or dropped boundary transmissions.
