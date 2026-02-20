@echo off
title Frontend - AI-DatabaseQuery

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [INFO] node_modules not found, running npm install...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Make sure Node.js is installed.
        pause
        exit /b 1
    )
)

echo Starting frontend at http://localhost:5173 ...
echo Press Ctrl+C to stop.
echo.

npm run dev

pause
