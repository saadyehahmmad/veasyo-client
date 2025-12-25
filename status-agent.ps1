# Check PC Agent Status
# This script checks if the PC Agent is running

Write-Host "📊 PC Agent Status Check" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

$isRunning = $false
$pidFromFile = $null

# Check PID file
if (Test-Path "pc-agent.pid") {
    $pidFromFile = Get-Content "pc-agent.pid" -ErrorAction SilentlyContinue
    
    if ($pidFromFile) {
        $process = Get-Process -Id $pidFromFile -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "✅ PC Agent is RUNNING" -ForegroundColor Green
            Write-Host ""
            Write-Host "Process Information:" -ForegroundColor Cyan
            Write-Host "  PID: $pidFromFile" -ForegroundColor White
            Write-Host "  Started: $($process.StartTime)" -ForegroundColor White
            Write-Host "  CPU Time: $($process.CPU) seconds" -ForegroundColor White
            Write-Host "  Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor White
            $isRunning = $true
        } else {
            Write-Host "⚠️  PID file exists but process not found (stale)" -ForegroundColor Yellow
            Write-Host "   Cleaning up stale PID file..." -ForegroundColor Yellow
            Remove-Item "pc-agent.pid" -Force
        }
    }
}

# If not found by PID file, search by command line
if (-not $isRunning) {
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*pc-agent*index.js*"
    }
    
    if ($processes) {
        Write-Host "✅ PC Agent is RUNNING" -ForegroundColor Green
        Write-Host "   (but PID file is missing - may have been started differently)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Found $($processes.Count) process(es):" -ForegroundColor Cyan
        foreach ($proc in $processes) {
            Write-Host "  PID: $($proc.Id), Started: $($proc.StartTime)" -ForegroundColor White
        }
        $isRunning = $true
    }
}

if (-not $isRunning) {
    Write-Host "❌ PC Agent is NOT RUNNING" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the agent:" -ForegroundColor Cyan
    Write-Host "  Run: .\start-background.ps1" -ForegroundColor White
    Write-Host "  Or: npm start (foreground)" -ForegroundColor White
}

Write-Host ""
Write-Host "Log Files:" -ForegroundColor Cyan
if (Test-Path "logs/pc-agent.log") {
    $logSize = [math]::Round((Get-Item "logs/pc-agent.log").Length / 1KB, 2)
    Write-Host "  pc-agent.log: $logSize KB" -ForegroundColor White
} else {
    Write-Host "  pc-agent.log: Not found" -ForegroundColor Yellow
}

if (Test-Path "logs/error.log") {
    $errorSize = [math]::Round((Get-Item "logs/error.log").Length / 1KB, 2)
    Write-Host "  error.log: $errorSize KB" -ForegroundColor White
} else {
    Write-Host "  error.log: Not found" -ForegroundColor Yellow
}

Write-Host ""

