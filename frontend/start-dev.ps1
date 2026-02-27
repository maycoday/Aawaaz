# Aawaaz Frontend Development Server Launcher
# Run this script to start the frontend development server

Write-Host "🎨 Starting Aawaaz Frontend Dev Server..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found! Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file" -ForegroundColor Green
    }
}

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
    npm install
    Write-Host ""
}

Write-Host "✅ Dependencies ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Starting Vite dev server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "The application will open at:" -ForegroundColor Green
Write-Host "  ➜ Local:   http://localhost:5173/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host ""

# Set execution policy and run dev server
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
npm run dev
