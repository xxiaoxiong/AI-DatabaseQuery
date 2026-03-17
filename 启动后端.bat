@echo off
title Backend - AI-DatabaseQuery

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] venv not found. Run: python -m venv venv ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [WARN] .env created from .env.example - please edit it first, then restart.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Checking if port 9999 is already in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9999 ^| findstr LISTENING 2^>nul') do (
    echo Port 9999 is in use by process %%a, stopping it...
    taskkill /F /PID %%a 2>nul
    timeout /t 1 >nul
)

echo.
echo Starting FastAPI at http://localhost:9999 ...
echo Press Ctrl+C to stop, or close this window.
echo.

venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 9999 --reload

echo.
echo Backend stopped.
