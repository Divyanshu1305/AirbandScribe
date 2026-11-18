#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "AirbandScribe // Starting Backend (FastAPI on Port 8000)"
echo "============================================================"

if [ -f venv/bin/activate ]; then
    source venv/bin/activate
fi

python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
