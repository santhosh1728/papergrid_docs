@echo off
title UltraPDF Hotfolder Watcher
cd /d "%~dp0"

echo ===============================================================
echo            UltraPDF - Hotfolder Drop & Done Service
echo ===============================================================
echo Drop PDF files into Desktop\AutoMerge\Input
echo Finished files will appear in Desktop\AutoMerge\Output
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" watcher.py
) else (
    python watcher.py
)

pause
