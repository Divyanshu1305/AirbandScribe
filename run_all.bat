@echo off
echo ============================================================
echo   AirbandScribe // Aeronautical VHF Speech Intelligence
echo   Launching Full Stack: Backend (Port 8000) + Frontend (Port 3000)
echo ============================================================
cd /d "%~dp0"

start "AirbandScribe Core API (Port 8000)" cmd /k run_backend.bat
timeout /t 2 /nobreak >nul
start "AirbandScribe Avionics Console (Port 3000)" cmd /k run_frontend.bat

echo.
echo ============================================================
echo   AirbandScribe Console is online!
echo   - Avionics Web Console: http://localhost:3000
echo   - Backend Core API:     http://127.0.0.1:8000
echo   - Interactive API Docs: http://127.0.0.1:8000/docs
echo ============================================================
