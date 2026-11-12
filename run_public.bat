@echo off
setlocal
cd /d "%~dp0"

set PUBLIC_MODE=true
set MAX_UPLOAD_MB=100

echo ==================================================
echo   UltraPDF Studio Pro - Public Web Mode (Port 8000)
echo ==================================================
echo   PUBLIC_MODE   = %PUBLIC_MODE%
echo   MAX_UPLOAD_MB = %MAX_UPLOAD_MB% MB
echo.
echo To expose on the public internet with Cloudflare Tunnel:
echo   cloudflared tunnel --url http://127.0.0.1:8000
echo ==================================================

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8000
) else (
    python -m uvicorn app:app --host 0.0.0.0 --port 8000
)

