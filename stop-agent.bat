@echo off
REM Stop PC Agent
echo Stopping PC Agent...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0stop-agent.ps1"

pause

