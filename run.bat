@echo off
title UltraPDF Web Server
cd /d "%~dp0"

echo ===============================================================
echo            UltraPDF - Offline PDF Merger & Compressor
echo ===============================================================
echo Starting local web server at http://127.0.0.1:8000 ...
echo Press Ctrl+C in this console anytime to stop the server.
echo.

:: Open browser automatically after a short 1 second delay
start "" "http://127.0.0.1:8000"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
) else (
    python -m uvicorn app:app --host 127.0.0.1 --port 8000
)

pause
