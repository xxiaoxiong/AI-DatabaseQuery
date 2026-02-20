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

echo Starting FastAPI at http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.

venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload

pause
