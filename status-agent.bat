@echo off
REM Check PC Agent Status
echo Checking PC Agent status...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0status-agent.ps1"

pause

