@echo off
echo ============================================================
echo   AirbandScribe // Core Transcription Backend (FastAPI :8000)
echo ============================================================
cd /d "%~dp0"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
