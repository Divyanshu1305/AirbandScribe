#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

chmod +x run_backend.sh run_frontend.sh

echo "============================================================"
echo "Launching ATC ASR Backend (Port 8000) and Frontend (Port 3000)..."
echo "============================================================"

./run_backend.sh &
BACKEND_PID=$!

./run_frontend.sh &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
