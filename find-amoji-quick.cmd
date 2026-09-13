@echo off
title Find amoji_engine_02
setlocal EnableExtensions
set "OUT=%~dp0find-amoji-result.txt"

echo Searching shallow paths only ^(fast^)... > "%OUT%"
echo. >> "%OUT%"

for %%P in (
  "D:\amoji_engine_02"
  "D:\projects\amoji_engine_02"
  "D:\dev\amoji_engine_02"
  "D:\code\amoji_engine_02"
  "D:\GitHub\amoji_engine_02"
  "D:\repos\amoji_engine_02"
  "C:\amoji_engine_02"
  "C:\projects\amoji_engine_02"
  "C:\dev\amoji_engine_02"
  "C:\Users\%USERNAME%\amoji_engine_02"
  "C:\Users\%USERNAME%\Documents\amoji_engine_02"
  "C:\Users\%USERNAME%\source\repos\amoji_engine_02"
  "C:\Users\%USERNAME%\Desktop\amoji_engine_02"
) do (
  if exist %%P\amoji-engine\scripts\lab-serve.mjs (
    echo FOUND: %%~P>> "%OUT%"
  )
)

echo Scanning D:\ depth 2...>> "%OUT%"
for /f "delims=" %%D in ('dir /b /ad "D:\" 2^>nul') do (
  if exist "D:\%%D\amoji_engine_02\amoji-engine\scripts\lab-serve.mjs" (
    echo FOUND: D:\%%D\amoji_engine_02>> "%OUT%"
  )
)

echo.>> "%OUT%"
echo Done %date% %time%>> "%OUT%"

type "%OUT%"
echo.
echo Saved to: %OUT%
echo.
pause
