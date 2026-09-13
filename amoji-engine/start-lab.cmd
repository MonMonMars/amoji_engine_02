@echo off
cd /d "%~dp0"
echo Starting lab at http://127.0.0.1:5173/
node scripts\lab-serve.mjs
pause
