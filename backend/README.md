# Aawaaj Backend API

Go backend server for Aawaaj anonymous harassment reporting platform.

## 🚀 Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL database (or Supabase account)

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run the server**
   ```bash
   go run .
   ```

Server will start on `http://localhost:8080`

## 📁 Project Structure

```
backend/
├── main.go         # Server initialization & routing
├── handlers.go     # HTTP request handlers
├── models.go       # Data structures
├── go.mod          # Go dependencies
└── .env.example    # Environment variables template
```

## 🔌 API Endpoints

### Complaint Endpoints

- `POST /api/v1/complaints` - Submit encrypted complaint
- `GET /api/v1/complaints/:id` - Get complaint (authority only)
- `GET /api/v1/complaints` - List complaints metadata

### Authority Endpoints

- `GET /api/v1/authorities` - List available authorities
- `GET /api/v1/authorities/:id` - Get authority details

### Pattern Detection

- `GET /api/v1/patterns` - Get detected patterns
- `GET /api/v1/patterns/department` - Department statistics

### Authority Access (requires auth)

- `GET /api/v1/authority/complaints` - Get assigned complaints
- `POST /api/v1/authority/decrypt` - Decrypt complaint

### Health Check

- `GET /health` - Service health status

## 🔐 Security Features

- CORS protection
- Security headers (XSS, HSTS, etc.)
- Zero-trust architecture
- Request logging
- Rate limiting (to be implemented)

## 🗄️ Database

Uses PostgreSQL with schema defined in `/database_schema.sql`

## 📦 Dependencies

- `gorilla/mux` - HTTP router
- `rs/cors` - CORS middleware
- `lib/pq` - PostgreSQL driver
- `golang-jwt/jwt` - JWT authentication
- `joho/godotenv` - Environment variables

## 🛠️ Development

```bash
# Run with auto-reload (install air first)
go install github.com/cosmtrek/air@latest
air

# Run tests
go test ./...

# Build binary
go build -o aawaaj-api
```

## 🚀 Deployment

```bash
# Build for production
CGO_ENABLED=0 GOOS=linux go build -o aawaaj-api

# Run with production env
PORT=8080 ./aawaaj-api
```
