#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/frontend"

echo "============================================================"
echo "AirbandScribe // Starting Avionics Web Console (Vite on Port 3000)"
echo "============================================================"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm run dev -- --host
