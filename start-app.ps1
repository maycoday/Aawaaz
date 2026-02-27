# Aawaaz Application Launcher
# This script starts both backend and frontend in separate windows

Write-Host "🚀 Aawaaz Application Launcher" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# Check if backend exists
$backendPath = Join-Path $projectRoot "backend"
if (-Not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

# Check if frontend exists
$frontendPath = Join-Path $projectRoot "frontend"
if (-Not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Check if backend .env exists
if (-Not (Test-Path (Join-Path $backendPath ".env"))) {
    Write-Host "⚠️  Backend .env not found!" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $backendPath ".env.example") (Join-Path $backendPath ".env")
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Configure your database in backend/.env" -ForegroundColor Red
    Write-Host "See SETUP_STATUS.md for instructions" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to continue (you can configure the database later)"
}

Write-Host "📊 Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "RemoteSigned", "-File", (Join-Path $backendPath "start-server.ps1") -WorkingDirectory $backendPath

Write-Host "⏳ Waiting 3 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "🎨 Starting Frontend Dev Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "RemoteSigned", "-File", (Join-Path $frontendPath "start-dev.ps1") -WorkingDirectory $frontendPath

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Backend:  http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check the separate windows for server logs." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
