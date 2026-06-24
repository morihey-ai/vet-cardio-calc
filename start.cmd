@echo off
setlocal
cd /d "%~dp0"
set "NODE_HOME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
set "PATH=%NODE_HOME%;%PATH%"
echo Starting Vet Cardio Calc...
echo.
echo Keep this window open while using the app.
echo.
call "%PNPM%" build
if errorlevel 1 (
  echo.
  echo Build failed. Please show this window to Codex.
  pause
  exit /b 1
)
echo Starting local app server...
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:5173'"
call "%PNPM%" preview
pause
