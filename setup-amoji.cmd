@echo off
title Setup Amoji
setlocal EnableExtensions

set "TARGET=D:\amoji_engine_02"
set "REPO=https://github.com/MonMonMars/amoji_engine_02.git"

echo.
echo  Amoji one-time setup
echo  ====================
echo  Target: %TARGET%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git not found. Install Git for Windows first.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

if not exist "%TARGET%\amoji-engine\scripts\lab-serve.mjs" (
  echo Cloning repository...
  if exist "%TARGET%" (
    echo Folder exists but incomplete — remove it or pick another path.
    pause
    exit /b 1
  )
  git clone "%REPO%" "%TARGET%"
  if errorlevel 1 (
    echo [ERROR] git clone failed
    pause
    exit /b 1
  )
) else (
  echo Repo already at %TARGET%
)

cd /d "%TARGET%\amoji-engine"
echo Installing dependencies...
call npm.cmd install
if errorlevel 1 (
  echo [ERROR] npm install failed
  pause
  exit /b 1
)

echo.
echo  Done! Starting companion...
echo  Bookmark: %TARGET%
echo.
cd /d "%TARGET%"
call start-companion.cmd
