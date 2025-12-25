# PC Agent - Install as Windows Service (Run as Administrator)
# This script ensures the service installation runs with proper admin privileges

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run with admin privileges:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to: $PSScriptRoot" -ForegroundColor Yellow
    Write-Host "4. Run: .\install-service-admin.ps1" -ForegroundColor Yellow
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

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "✅ Created .env file. Please edit it with your configuration." -ForegroundColor Green
        Write-Host ""
        $continue = Read-Host "Press Enter to continue installation or Ctrl+C to exit and configure .env first"
    } else {
        Write-Host "❌ env.example not found. Cannot create .env file." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "🔨 Building PC Agent..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Check if service already exists
$serviceName = "WaiterPCAgent"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "⚠️  Service '$serviceName' already exists!" -ForegroundColor Yellow
    Write-Host "Service Status: $($existingService.Status)" -ForegroundColor Yellow
    Write-Host ""
    $uninstall = Read-Host "Would you like to uninstall the existing service first? (Y/N)"
    
    if ($uninstall -eq 'Y' -or $uninstall -eq 'y') {
        Write-Host "🗑️  Uninstalling existing service..." -ForegroundColor Cyan
        npm run uninstall-service
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Uninstallation failed!" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        # Wait a moment for service to fully uninstall
        Write-Host "⏳ Waiting for service to uninstall..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3
    } else {
        Write-Host "❌ Installation cancelled." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "📦 Installing PC Agent as Windows Service..." -ForegroundColor Cyan
Write-Host ""

# Run the install command
node dist/scripts/install-service.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Installation completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Management:" -ForegroundColor Cyan
    Write-Host "  • View service: Run 'services.msc' and look for '$serviceName'" -ForegroundColor White
    Write-Host "  • Check logs: .\logs\pc-agent.log" -ForegroundColor White
    Write-Host "  • Uninstall: Run .\uninstall-service-admin.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"

