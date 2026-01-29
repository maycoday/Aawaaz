# Aawaaj Frontend

React + Vite frontend for Aawaaj anonymous harassment reporting platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

Frontend will start on `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── ReportForm.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── PatternDetection.jsx
│   │   ├── AuthorityPortal.jsx
│   │   └── Footer.jsx
│   ├── services/     # API & encryption services
│   │   ├── api.js
│   │   └── encryption.js
│   ├── App.jsx       # Main app component
│   ├── main.jsx      # React entry point
│   └── index.css     # Global styles
├── package.json
└── vite.config.js
```

## 🔐 Web Crypto API

Client-side encryption implementation:

- **AES-256-GCM** for complaint data
- **RSA-OAEP** for key encryption (simulated)
- All encryption happens in browser
- Zero plaintext transmission

## 🎨 Components

### ReportForm
- Complaint submission form
- Authority selection
- Real-time encryption
- Success modal with reference code

### PatternDetection
- Anonymized analytics
- Department trends
- Incident type breakdown
- Alert system

### AuthorityPortal
- Demo decryption interface
- Access control visualization

## 📦 Dependencies

- `react` - UI library
- `react-router-dom` - Routing
- `axios` - HTTP client
- `vite` - Build tool

## 🛠️ Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Build

```bash
npm run build
# Deploy 'dist' folder to your hosting service
```

## 🔌 API Integration

Configure API endpoint in `.env`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

## 🎯 Key Features

- Real AES-256 encryption in browser
- Visual encryption flow animation
- Authority selection with HR bypass
- Pattern detection dashboard
- Responsive design
- Zero tracking/analytics
