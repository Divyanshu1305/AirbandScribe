#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

echo "Starting ATC ASR Transcription Backend on http://127.0.0.1:8000"
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
