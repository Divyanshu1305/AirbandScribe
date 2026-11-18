@echo off
echo ============================================================
echo Launching ATC ASR Full Application (Backend + Frontend)
echo ============================================================
cd /d "%~dp0"

start "ATC ASR Backend (Port 8000)" cmd /k run_backend.bat
timeout /t 2 /nobreak >nul
start "ATC ASR Frontend (Port 3000)" cmd /k run_frontend.bat

echo.
echo ============================================================
echo   ATC ASR Intelligence Console is launching!
echo   - Backend API:    http://127.0.0.1:8000
echo   - Interactive UI: http://localhost:3000 (or http://127.0.0.1:8000)
echo   - Swagger Docs:   http://127.0.0.1:8000/docs
echo ============================================================
