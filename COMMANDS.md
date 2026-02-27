# 🎯 Aawaaj - Developer Cheat Sheet

Quick reference for all commands and configurations.

---

## 🚀 Quick Start (Copy-Paste Ready)

### Start Development Environment

```powershell
# Terminal 1 - Backend
cd backend
go mod download
go run .

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev

# Browser
start http://localhost:3000
```

---

## 📦 Installation Commands

### Initial Setup
```bash
# Clone repository
git clone https://github.com/yourusername/aawaaj.git
cd aawaaj
```

### Backend (Go)
```bash
cd backend

# Install dependencies
go mod download

# Install with vendor
go mod vendor

# Verify installation
go mod verify

# Update dependencies
go get -u ./...
go mod tidy
```

### Frontend (React)
```bash
cd frontend

# Install with npm
npm install

# Install with yarn
yarn install

# Install specific package
npm install axios

# Update dependencies
npm update

# Audit security
npm audit fix
```

---

## 🏃 Running Commands

### Backend Development
```bash
cd backend

# Run with hot reload (requires air)
air

# Run standard
go run .

# Run with custom port
PORT=9000 go run .

# Run with environment file
go run . --env=.env.local

# Build and run
go build -o aawaaj && ./aawaaj
```

### Frontend Development
```bash
cd frontend

# Start dev server
npm run dev

# Start on different port
npm run dev -- --port 3001

# Start with host access
npm run dev -- --host

# Clear cache and start
npm cache clean --force && npm run dev
```

---

## 🏗️ Build Commands

### Frontend Production Build
```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview

# Build with custom base path
npm run build -- --base=/aawaaj/

# Analyze bundle size
npm run build -- --analyze
```

### Backend Production Build
```bash
cd backend

# Build for current OS
go build -o aawaaj-api

# Build for Linux
GOOS=linux GOARCH=amd64 go build -o aawaaj-api-linux

# Build for Windows
GOOS=windows GOARCH=amd64 go build -o aawaaj-api.exe

# Build optimized
go build -ldflags="-s -w" -o aawaaj-api

# Build with no CGO
CGO_ENABLED=0 go build -o aawaaj-api
```

---

## 🗄️ Database Commands

### Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Init project
supabase init

# Start local instance
supabase start

# Run migrations
supabase db push

# Generate types
supabase gen types typescript --local > types/supabase.ts
```

### PostgreSQL Local
```bash
# Create database
createdb aawaaj

# Run schema
psql -d aawaaj -f database_schema.sql

# Connect to database
psql -d aawaaj

# Dump database
pg_dump aawaaj > backup.sql

# Restore database
psql -d aawaaj < backup.sql
```

---

## 🧪 Testing Commands

### Backend Tests
```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run with verbose output
go test -v ./...

# Run specific test
go test -run TestCreateComplaint

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend Tests (if added)
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u
```

---

## 🔍 Debugging Commands

### Backend Debugging
```bash
# Run with race detector
go run -race .

# Run with memory profiling
go run . -memprofile=mem.prof

# Run with CPU profiling
go run . -cpuprofile=cpu.prof

# View profile
go tool pprof cpu.prof
```

### Frontend Debugging
```bash
# Check for unused dependencies
npx depcheck

# Analyze bundle
npm run build -- --analyze

# Check types (if using TypeScript)
npx tsc --noEmit
```

---

## 📝 Linting & Formatting

### Backend (Go)
```bash
cd backend

# Format code
go fmt ./...

# Run linter (requires golangci-lint)
golangci-lint run

# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Vet code
go vet ./...
```

### Frontend (React)
```bash
cd frontend

# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format with Prettier (if installed)
npx prettier --write "src/**/*.{js,jsx,css}"
```

---

## 🌐 API Testing

### Using curl
```bash
# Health check
curl http://localhost:8080/health

# List authorities
curl http://localhost:8080/api/v1/authorities

# Submit complaint (with dummy data)
curl -X POST http://localhost:8080/api/v1/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedData": "base64_data",
    "iv": "base64_iv",
    "encryptedKeys": [],
    "metadata": {
      "incidentType": "verbal",
      "department": "engineering"
    }
  }'

# Get patterns
curl http://localhost:8080/api/v1/patterns
```

### Using PowerShell
```powershell
# Health check
Invoke-RestMethod -Uri http://localhost:8080/health

# List authorities
Invoke-RestMethod -Uri http://localhost:8080/api/v1/authorities | ConvertTo-Json

# Submit complaint
$body = @{
    encryptedData = "base64_data"
    iv = "base64_iv"
    encryptedKeys = @()
    metadata = @{
        incidentType = "verbal"
        department = "engineering"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/api/v1/complaints -Method Post -Body $body -ContentType "application/json"
```

---

## 🚢 Deployment Commands

### Vercel (Frontend)
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Environment variables
vercel env add VITE_API_URL
```

### Backend Deployment
```bash
cd backend

# Build for production
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o aawaaj-api

# Copy to server (SCP)
scp aawaaj-api user@server:/opt/aawaaj/

# SSH and run
ssh user@server
cd /opt/aawaaj
./aawaaj-api

# Run with systemd (create service file)
sudo systemctl start aawaaj
sudo systemctl enable aawaaj
```

### Docker (Optional)
```bash
# Build backend image
cd backend
docker build -t aawaaj-backend .

# Build frontend image
cd frontend
docker build -t aawaaj-frontend .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 🔧 Environment Variables

### Backend (.env)
```bash
PORT=8080
DATABASE_URL=postgresql://user:pass@host:5432/aawaaj
JWT_SECRET=your_secret_key
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Aawaaj
VITE_ENABLE_LOGGING=true
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port (Windows)
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Find process on port (Mac/Linux)
lsof -ti:8080
kill -9 <PID>
```

### Clear Caches
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Backend
cd backend
go clean -cache -modcache -i -r
go mod download
```

### Reset Everything
```bash
# Frontend
cd frontend
rm -rf node_modules dist .vite
npm install

# Backend
cd backend
rm -rf vendor aawaaj-api
go clean
go mod download
```

---

## 📊 Monitoring

### View Logs
```bash
# Backend logs (if using file logging)
tail -f backend/logs/aawaaj.log

# Frontend dev server logs
# Check terminal running npm run dev

# System logs (Linux)
journalctl -u aawaaj -f
```

### Performance Monitoring
```bash
# Backend memory usage
go tool pprof http://localhost:8080/debug/pprof/heap

# Frontend performance (browser)
# Open DevTools > Performance > Record
```

---

## 🎯 Git Commands

### Common Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature

# Pull latest
git pull origin main

# Merge main into feature
git merge main
```

### Useful Commands
```bash
# View changes
git status
git diff

# Undo changes
git restore <file>
git reset --hard HEAD

# View history
git log --oneline --graph

# Create tag
git tag v1.0.0
git push origin v1.0.0
```

---

## 📚 Quick Reference Links

- [Go Documentation](https://go.dev/doc/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)

---

## 🎬 Full Demo Script

```bash
# 1. Start Backend
cd backend && go run . &

# 2. Start Frontend
cd frontend && npm run dev &

# 3. Open Browser
start http://localhost:3000

# 4. Open DevTools Console (F12)

# 5. Submit a complaint and watch logs

# 6. Check backend terminal for API logs

# 7. Check browser console for encryption logs
```

---

**💡 Tip:** Bookmark this file for quick reference!

**🔖 Save these commands:**
- `cd backend && go run .` → Start backend
- `cd frontend && npm run dev` → Start frontend
- `go build && ./aawaaj-api` → Build & run backend
- `npm run build` → Build frontend for production

---

**Last updated:** January 29, 2026
**Project:** Aawaaj - WS010 Hackathon
