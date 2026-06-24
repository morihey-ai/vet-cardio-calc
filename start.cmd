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
start "" powershell -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:5173'; for($i=0; $i -lt 30; $i++){ try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process $url; exit 0 } catch { Start-Sleep -Seconds 1 } }; Start-Process $url"
call "%PNPM%" preview
pause
