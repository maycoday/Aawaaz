# 🚀 Aawaaj Quick Start Guide

Get Aawaaj running in 5 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] Go 1.21+ installed ([Download](https://go.dev/dl/))
- [ ] PostgreSQL or Supabase account ([Sign up](https://supabase.com))
- [ ] Git installed

## Step-by-Step Setup

### 1️⃣ Clone & Setup Database (2 min)

```bash
# Clone repository
git clone https://github.com/yourusername/aawaaj.git
cd aawaaj

# Create Supabase project
# Go to https://supabase.com and create new project
# Copy the database URL
```

**Setup Database:**
1. Open Supabase SQL Editor
2. Copy entire contents of `database_schema.sql`
3. Paste and execute
4. ✅ Database ready!

### 2️⃣ Start Backend (1 min)

```bash
# Open Terminal 1
cd backend

# Install dependencies
go mod download

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials
# DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Start server
go run .
```

✅ Backend running on `http://localhost:8080`

### 3️⃣ Start Frontend (1 min)

```bash
# Open Terminal 2
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
cp .env.example .env

# Start dev server
npm run dev
```

✅ Frontend running on `http://localhost:3000`

### 4️⃣ Test the App (1 min)

1. Open browser: `http://localhost:3000`
2. Fill out the complaint form
3. Select authorities (ICC, NGO recommended)
4. Click "Encrypt & Submit Report"
5. See success modal with reference code!

**Check Console:**
- Open browser DevTools (F12)
- See encryption logs: ✅ Key generated, ✅ Data encrypted
- Check Terminal 1 for backend API logs

## 🎯 Quick Demo Features

### Try These:
- ✅ Submit a complaint with different incident types
- ✅ Bypass HR by unchecking HR authority
- ✅ View pattern detection dashboard (scroll down)
- ✅ Check the "How It Works" section
- ✅ Inspect the authority portal

### Console Commands:
```javascript
// In browser console, check if Web Crypto is available
console.log('Crypto API:', window.crypto.subtle ? '✅ Available' : '❌ Not available');
```

## 🛠️ Troubleshooting

### Backend Won't Start?
```bash
# Check Go version
go version  # Should be 1.21+

# Check if port 8080 is free
# Windows:
netstat -ano | findstr :8080
# Mac/Linux:
lsof -i :8080

# Try different port
PORT=9000 go run .
```

### Frontend Issues?
```bash
# Check Node version
node --version  # Should be 18+

# Clear npm cache
npm cache clean --force
npm install

# Try different port
npm run dev -- --port 3001
```

### Database Connection Error?
- ✅ Check Supabase project is running
- ✅ Verify DATABASE_URL in backend/.env
- ✅ Ensure password is correct
- ✅ Check firewall/network settings

### CORS Error?
- ✅ Backend must be running on port 8080
- ✅ Frontend must be running on port 3000
- ✅ Check ALLOWED_ORIGINS in backend/.env

## 📦 Production Deployment

### Deploy Frontend to Vercel (1 min)
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, done! 🎉
```

### Deploy Backend
```bash
cd backend

# Build binary
CGO_ENABLED=0 GOOS=linux go build -o aawaaj-api

# Upload to your server and run
./aawaaj-api
```

## 🎓 Next Steps

1. **Customize**: Edit components in `frontend/src/components/`
2. **Add Features**: Extend API in `backend/handlers.go`
3. **Style**: Modify `style.css` or component styles
4. **Database**: Add tables in `database_schema.sql`
5. **Deploy**: Push to Vercel (frontend) + your server (backend)

## 📚 Learn More

- [Frontend README](frontend/README.md) - React components & encryption
- [Backend README](backend/README.md) - API endpoints & Go server
- [Database Schema](database_schema.sql) - PostgreSQL structure
- [Presentation](HACKATHON_SLIDE.md) - Hackathon slide content

## 💡 Tips for Hackathon Demo

1. **Show Encryption**: Open DevTools console before submitting
2. **Highlight HR Bypass**: Uncheck HR authority box
3. **Pattern Detection**: Scroll to show analytics dashboard
4. **Reference Code**: Save it from success modal
5. **Console Logs**: Show "🔒 Plaintext NEVER sent to server"

## 🤝 Need Help?

- 📖 Read the [main README](README.md)
- 💬 Open an issue on GitHub
- 📧 Contact project maintainer

---

**Ready? Let's go! 🚀**

```bash
# Terminal 1
cd backend && go run .

# Terminal 2  
cd frontend && npm run dev

# Browser
open http://localhost:3000
```

**Your voice. Your control. 🔒**
