# Start PC Agent in Background
# This script runs the PC Agent as a background process

Write-Host "Starting PC Agent in Background..." -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check if .env file exists
if (-not (Test-Path ".env"))
{
    Write-Host "Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example")
    {
        Copy-Item "env.example" ".env"
        Write-Host "Created .env file. Please edit it with your configuration before running." -ForegroundColor Green
        Write-Host ""
        notepad .env
        exit 0
    }
    else
    {
        Write-Host "env.example not found. Cannot create .env file." -ForegroundColor Red
        exit 1
    }
}

# Build if dist doesn't exist
if (-not (Test-Path "dist\index.js"))
{
    Write-Host "Building PC Agent..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -ne 0)
    {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build successful" -ForegroundColor Green
    Write-Host ""
}

# Check if already running
$existingProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*pc-agent*index.js*"
}

if ($existingProcess)
{
    Write-Host "PC Agent is already running (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    Write-Host ""
    $restart = Read-Host "Would you like to restart it? (Y/N)"
    
    if ($restart -eq 'Y' -or $restart -eq 'y')
    {
        Write-Host "Stopping existing process..." -ForegroundColor Cyan
        Stop-Process -Id $existingProcess.Id -Force
        Start-Sleep -Seconds 2
        Write-Host "Stopped" -ForegroundColor Green
    }
    else
    {
        Write-Host "Keeping existing process running." -ForegroundColor Yellow
        exit 0
    }
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs"))
{
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start the process in background
Write-Host "Starting PC Agent in background..." -ForegroundColor Cyan

$processInfo = Start-Process -FilePath "node" -ArgumentList "dist\index.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru

# Wait a moment and check if it's still running
Start-Sleep -Seconds 2

if (Get-Process -Id $processInfo.Id -ErrorAction SilentlyContinue)
{
    Write-Host "PC Agent started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Process Information:" -ForegroundColor Cyan
    Write-Host "  PID: $($processInfo.Id)" -ForegroundColor White
    Write-Host "  Logs: .\logs\pc-agent.log" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop the agent:" -ForegroundColor Cyan
    Write-Host "  Run: .\stop-agent.ps1" -ForegroundColor White
    Write-Host "  Or: npm run stop" -ForegroundColor White
    Write-Host "  Or: Stop-Process -Id $($processInfo.Id)" -ForegroundColor White
    Write-Host ""
    
    # Save PID to file for easy stopping later
    $processInfo.Id | Out-File -FilePath "pc-agent.pid" -Force
    Write-Host "PID saved to pc-agent.pid" -ForegroundColor Green
}
else
{
    Write-Host "Failed to start PC Agent!" -ForegroundColor Red
    Write-Host "Check logs\error.log for details" -ForegroundColor Yellow
    exit 1
}
