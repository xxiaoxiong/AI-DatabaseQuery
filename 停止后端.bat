@echo off
title Stop Backend - AI-DatabaseQuery

echo Stopping backend service on port 9999...

taskkill /F /IM uvicorn.exe 2>nul

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9999 ^| findstr LISTENING') do (
    echo Killing process %%a on port 9999...
    taskkill /F /PID %%a 2>nul
)

echo.
echo Backend service stopped.
pause
