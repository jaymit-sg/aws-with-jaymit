@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Could not install dependencies. Check Python and internet access.
  pause
  exit /b 1
)
python sync_playlists.py
pause
