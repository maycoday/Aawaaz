# Aawaaz Backend Server Launcher
# Run this script to start the backend server

Write-Host "🚀 Starting Aawaaz Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure your database settings." -ForegroundColor Yellow
    exit 1
}

# Check if database URL is configured
$envContent = Get-Content ".env" -Raw
if ($envContent -match "your_password" -or $envContent -match "your-project") {
    Write-Host "⚠️  WARNING: Database credentials not configured!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please update the following in backend/.env:" -ForegroundColor Cyan
    Write-Host "  - DATABASE_URL" -ForegroundColor White
    Write-Host "  - DB_HOST" -ForegroundColor White
    Write-Host "  - DB_PASSWORD" -ForegroundColor White
    Write-Host ""
    Write-Host "See SETUP_STATUS.md for database setup instructions." -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

Write-Host "📦 Building server..." -ForegroundColor Green
go build -o aawaaz-server.exe

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Starting server on http://localhost:8080" -ForegroundColor Cyan
    Write-Host "📝 API available at http://localhost:8080/api/v1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "============================================" -ForegroundColor DarkGray
    Write-Host ""
    
    # Run the server
    .\aawaaz-server.exe
} else {
    Write-Host "❌ Build failed! Check for errors above." -ForegroundColor Red
    exit 1
}
