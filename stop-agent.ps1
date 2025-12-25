# Stop PC Agent Background Process
# This script stops the PC Agent if it's running in the background

Write-Host "🛑 Stopping PC Agent..." -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check if PID file exists
if (Test-Path "pc-agent.pid") {
    $pid = Get-Content "pc-agent.pid" -ErrorAction SilentlyContinue
    
    if ($pid) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "Found process (PID: $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
            Start-Sleep -Seconds 1
            
            # Verify it stopped
            $stillRunning = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if (-not $stillRunning) {
                Write-Host "✅ PC Agent stopped successfully" -ForegroundColor Green
                Remove-Item "pc-agent.pid" -Force
            } else {
                Write-Host "⚠️  Process may still be running" -ForegroundColor Yellow
            }
        } else {
            Write-Host "ℹ️  Process not running (stale PID file)" -ForegroundColor Yellow
            Remove-Item "pc-agent.pid" -Force
        }
    }
} else {
    # Try to find by command line
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*pc-agent*index.js*"
    }
    
    if ($processes) {
        Write-Host "Found $($processes.Count) PC Agent process(es)" -ForegroundColor Yellow
        foreach ($proc in $processes) {
            Write-Host "  Stopping PID: $($proc.Id)" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force
        }
        Start-Sleep -Seconds 1
        Write-Host "✅ All PC Agent processes stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No PC Agent process found running" -ForegroundColor Yellow
    }
}

Write-Host ""

