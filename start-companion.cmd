@echo off
REM Amoji Companion — double-click or run from CMD (avoids PowerShell npm policy issues)
cd /d "%~dp0amoji-engine"
if not exist "scripts\lab-serve.mjs" (
  echo ERROR: amoji-engine folder not found.
  echo This file must live in the repo root next to the amoji-engine folder.
  echo Repo: https://github.com/MonMonMars/amoji_engine_02
  pause
  exit /b 1
)
echo.
echo  Amoji Companion
echo  ---------------
echo  Ollama: keep "ollama serve" running (your models: qwen3:4b, qwen3:8b)
echo  Browser: http://127.0.0.1:5173/
echo.
node scripts\lab-serve.mjs
pause
