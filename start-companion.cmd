@echo off
title Amoji Companion
setlocal EnableExtensions
cd /d "%~dp0"

set "LOG=%~dp0start-companion.log"
echo === Amoji %date% %time% ===> "%LOG%"
echo Folder: %~dp0>> "%LOG%"

echo.
echo  Amoji Companion launcher
echo  ======================
echo  Folder: %~dp0
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not in PATH.
  echo         Install: https://nodejs.org
  echo         Or add your Node folder to PATH ^(e.g. D:\devtools\node^)
  echo [ERROR] Node not found>> "%LOG%"
  echo.
  echo Press any key to close...
  pause >nul
  exit /b 1
)

for /f "delims=" %%V in ('node -v 2^>nul') do set "NODEVER=%%V"
echo Node: %NODEVER%
echo Node: %NODEVER%>> "%LOG%"

if not exist "%~dp0amoji-engine\scripts\lab-serve.mjs" (
  echo [ERROR] amoji-engine not found here.
  echo         This file must sit in the repo ROOT next to folder: amoji-engine\
  echo.
  echo         You may be in the wrong place, or need a fresh copy.
  echo         Run: setup-amoji.cmd  ^(clones to D:\amoji_engine_02^)
  echo [ERROR] lab-serve.mjs missing>> "%LOG%"
  echo.
  echo Press any key to close...
  pause >nul
  exit /b 1
)

cd /d "%~dp0amoji-engine"

if not exist "node_modules" (
  echo First run — installing dependencies...
  echo Installing npm packages...>> "%LOG%"
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install failed. See log: %LOG%
    pause >nul
    exit /b 1
  )
)

echo.
echo  Ollama: keep running ^(qwen3:4b on D:\Ollama^)
echo  Browser: http://127.0.0.1:5173/
echo  Log: %LOG%
echo.
echo Starting server... ^(Ctrl+C to stop^)
echo.

node scripts\lab-serve.mjs >> "%LOG%" 2>&1
set "EXITCODE=%ERRORLEVEL%"
echo.
echo Server exited with code %EXITCODE%
echo Exit %EXITCODE%>> "%LOG%"
echo Press any key to close...
pause >nul
exit /b %EXITCODE%
