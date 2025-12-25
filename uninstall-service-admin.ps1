# PC Agent - Uninstall Windows Service (Run as Administrator)
# This script ensures the service uninstallation runs with proper admin privileges

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run with admin privileges:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to: $PSScriptRoot" -ForegroundColor Yellow
    Write-Host "4. Run: .\uninstall-service-admin.ps1" -ForegroundColor Yellow
    Write-Host ""
    
    # Offer to restart with admin privileges
    $restart = Read-Host "Would you like to restart this script with admin privileges? (Y/N)"
    if ($restart -eq 'Y' -or $restart -eq 'y') {
        Start-Process PowerShell -Verb RunAs -ArgumentList "-NoExit", "-File", "`"$PSCommandPath`""
        exit
    }
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check if service exists
$serviceName = "WaiterPCAgent"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if (-not $existingService) {
    Write-Host "ℹ️  Service '$serviceName' is not installed." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "📋 Service Information:" -ForegroundColor Cyan
Write-Host "  Name: $($existingService.Name)" -ForegroundColor White
Write-Host "  Status: $($existingService.Status)" -ForegroundColor White
Write-Host "  Display Name: $($existingService.DisplayName)" -ForegroundColor White
Write-Host ""

# Confirm uninstallation
$confirm = Read-Host "Are you sure you want to uninstall the service? (Y/N)"
if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "❌ Uninstallation cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

# Stop service if running
if ($existingService.Status -eq 'Running') {
    Write-Host "🛑 Stopping service..." -ForegroundColor Cyan
    Stop-Service -Name $serviceName -Force
    Write-Host "✅ Service stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host "🗑️  Uninstalling service..." -ForegroundColor Cyan
Write-Host ""

# Build if needed
if (-not (Test-Path "dist/scripts/uninstall-service.js")) {
    Write-Host "🔨 Building project first..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Run the uninstall command
node dist/scripts/uninstall-service.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Service uninstalled successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The PC Agent can still be run manually with:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Uninstallation failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can manually remove the service using:" -ForegroundColor Yellow
    Write-Host "  1. Open services.msc" -ForegroundColor White
    Write-Host "  2. Find '$serviceName'" -ForegroundColor White
    Write-Host "  3. Stop it if running" -ForegroundColor White
    Write-Host "  4. Open Command Prompt as Admin" -ForegroundColor White
    Write-Host "  5. Run: sc delete $serviceName" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"

