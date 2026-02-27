package main

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No .env file found, using environment variables")
	}

	// Initialize database connection
	dbConn, err := InitDatabase()
	if err != nil {
		log.Fatalf("❌ Database initialization failed: %v", err)
	}
	defer dbConn.Close()

	// Assign to global db variable for standalone handlers
	db = dbConn

	// Verify database schema
	if err := RunMigrations(dbConn); err != nil {
		log.Printf("⚠️  Migration check: %v", err)
	}

	// Initialize handlers
	complaintHandler := NewComplaintHandler(dbConn)

	// Initialize pattern service
	log.Println("🔍 Initializing pattern detection service...")
	patternService = NewPatternService(dbConn)

	// Start pattern analysis scheduler
	log.Println("🕐 Starting pattern analysis scheduler...")
	patternService.StartScheduler()

	// Initialize router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// ============================================
	// COMPLAINT ROUTES
	// ============================================
	
	// New production-ready endpoint
	api.HandleFunc("/complaints/submit", complaintHandler.SubmitComplaint).Methods("POST", "OPTIONS")
	
	// Legacy endpoints (kept for compatibility)
	api.HandleFunc("/complaints", CreateComplaint).Methods("POST", "OPTIONS")
	api.HandleFunc("/complaints/track", TrackComplaint).Methods("GET", "OPTIONS")
	api.HandleFunc("/complaints/{id}", GetComplaint).Methods("GET", "OPTIONS")
	api.HandleFunc("/complaints", ListComplaints).Methods("GET", "OPTIONS")
	api.HandleFunc("/complaints/{id}/status", UpdateComplaintStatus).Methods("PUT", "OPTIONS")
	api.HandleFunc("/complaints/{id}/notes", AddComplaintNote).Methods("POST", "OPTIONS")

	// ============================================
	// AUTHORITY ROUTES
	// ============================================
	api.HandleFunc("/authorities", ListAuthorities).Methods("GET", "OPTIONS")
	api.HandleFunc("/authorities/{id}", GetAuthority).Methods("GET", "OPTIONS")
	api.HandleFunc("/authority/login", AuthorityLogin).Methods("POST", "OPTIONS")

	// ============================================
	// PATTERN DETECTION ROUTES
	// ============================================
	api.HandleFunc("/patterns", GetPatterns).Methods("GET", "OPTIONS")
	api.HandleFunc("/patterns/department", GetDepartmentPatterns).Methods("GET", "OPTIONS")
	api.HandleFunc("/patterns/alerts", GetPatternAlerts).Methods("GET", "OPTIONS")
	api.HandleFunc("/patterns/report", GetPatternReport).Methods("GET", "OPTIONS")

	// ============================================
	// AUTHORITY ACCESS ROUTES (requires authentication)
	// ============================================
	api.HandleFunc("/authority/{authorityId}/complaints", GetAuthorityComplaints).Methods("GET", "OPTIONS")
	api.HandleFunc("/authority/{authorityId}/complaints/{complaintId}", GetAuthorityComplaintDetail).Methods("GET", "OPTIONS")
	api.HandleFunc("/authority/{authorityId}/complaints/{complaintId}/status", UpdateAuthorityComplaintStatus).Methods("PATCH", "OPTIONS")
	api.HandleFunc("/authority/{authorityId}/complaints/{complaintId}/notes", AddAuthorityComplaintNote).Methods("POST", "OPTIONS")
	api.HandleFunc("/authority/{authorityId}/actions", LogAuthorityAction).Methods("POST", "OPTIONS")
	api.HandleFunc("/authority/decrypt", DecryptComplaint).Methods("POST", "OPTIONS")

	// ============================================
	// HEALTH CHECK
	// ============================================
	router.HandleFunc("/health", HealthCheck).Methods("GET")
	router.HandleFunc("/health/db", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(); err != nil {
			respondWithError(w, http.StatusServiceUnavailable, "Database unhealthy")
			return
		}
		respondWithJSON(w, http.StatusOK, map[string]string{"status": "healthy", "database": "connected"})
	}).Methods("GET")

	// ============================================
	// MIDDLEWARE
	// ============================================
	router.Use(loggingMiddleware)
	router.Use(securityHeadersMiddleware)
	router.Use(RateLimitMiddleware) // Optional rate limiting

	// ============================================
	// CORS CONFIGURATION
	// ============================================
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:5174"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	handler := c.Handler(router)

	// ============================================
	// START SERVER
	// ============================================
	port := getEnv("PORT", "8080")

	log.Println("============================================")
	log.Printf("🚀 Aawaaj API Server starting on port %s", port)
	log.Println("🔒 Zero-trust architecture enabled")
	log.Println("🔐 End-to-end encryption active")
	log.Println("🛡️  CORS enabled for React frontend")
	log.Println("💾 Database: Connected")
	log.Println("============================================")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}

// ============================================
// MIDDLEWARE
// ============================================

// Middleware for request logging
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("📨 %s %s %s", r.Method, r.RequestURI, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}

// Security headers middleware
func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

// ============================================
// HEALTH CHECK
// ============================================

// Health check endpoint
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "aawaaj-api",
		"version": "2.0.0",
	})
}
