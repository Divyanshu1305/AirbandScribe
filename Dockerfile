# ==============================================================================
# AirbandScribe — Aeronautical VHF Speech Transcription Engine (CPU Container)
# Single-container build: FastAPI backend + pre-built React frontend (port 8000)
# ==============================================================================

FROM python:3.12-slim

# ── Environment ────────────────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DEVICE=cpu

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        wget \
        tar \
        libsndfile1 \
        build-essential \
        nodejs \
        npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ────────────────────────────────────────
COPY requirements_transcribe.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements_transcribe.txt

# ── Download CrispASR Linux CPU binary ────────────────────────────────────────
# (Windows .exe won't run on Linux; we fetch the native Linux build)
RUN mkdir -p bin/cpu /tmp/crisp && \
    curl -fL -o /tmp/crispasr.tar.gz \
        https://github.com/CrispStrobe/CrispASR/releases/download/v0.8.10/crispasr-linux-x86_64.tar.gz && \
    tar -xzf /tmp/crispasr.tar.gz -C /tmp/crisp && \
    find /tmp/crisp -maxdepth 2 -type f | head -1 | xargs -I{} cp {} bin/cpu/crispasr && \
    chmod +x bin/cpu/crispasr && \
    # Also create a symlink called crispasr.exe so the auto-resolver finds it
    ln -sf /app/bin/cpu/crispasr /app/bin/cpu/crispasr.exe && \
    rm -rf /tmp/crisp /tmp/crispasr.tar.gz

# ── Download Whisper base.en model (Whisper GGUF ~147 MB) ─────────────────────
# This is the same model used locally. For the ATC fine-tuned parakeet model,
# replace the URL and filename below.
RUN mkdir -p models/ggufs && \
    curl -fL -o models/ggufs/speech-model.gguf \
        https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

# ── Download & cache Silero VAD model ─────────────────────────────────────────
RUN mkdir -p /root/.cache/crispasr && \
    curl -fL -o /root/.cache/crispasr/ggml-silero-v6.2.0.bin \
        https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin

# ── Copy application source ────────────────────────────────────────────────────
COPY . /app

# ── Build React/Vite frontend → frontend/dist/ ────────────────────────────────
RUN if [ -d frontend ]; then \
        cd frontend && npm install && npm run build; \
    fi

# ── Initialise SQLite database ─────────────────────────────────────────────────
RUN python3 -c "import database; database.init_db()" && \
    chmod 666 /app/transcriptions.db || true

# ── Runtime directories ────────────────────────────────────────────────────────
RUN mkdir -p output test-files uploads

# ── Port ───────────────────────────────────────────────────────────────────────
# 8000 → FastAPI (also serves the pre-built React SPA)
EXPOSE 8000

# ── Health check ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/status || exit 1

# ── Launch ─────────────────────────────────────────────────────────────────────
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

