@echo off
REM Start PC Agent in Background
echo Starting PC Agent in background...
echo.

REM Build if needed
if not exist "dist\index.js" (
    echo Building PC Agent...
    call npm run build
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

REM Start in background using PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0start-background.ps1"

pause

