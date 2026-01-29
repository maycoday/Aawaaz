package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Complaint routes
	api.HandleFunc("/complaints", CreateComplaint).Methods("POST", "OPTIONS")
	api.HandleFunc("/complaints/{id}", GetComplaint).Methods("GET", "OPTIONS")
	api.HandleFunc("/complaints", ListComplaints).Methods("GET", "OPTIONS")
	
	// Authority routes
	api.HandleFunc("/authorities", ListAuthorities).Methods("GET", "OPTIONS")
	api.HandleFunc("/authorities/{id}", GetAuthority).Methods("GET", "OPTIONS")
	
	// Pattern detection routes
	api.HandleFunc("/patterns", GetPatterns).Methods("GET", "OPTIONS")
	api.HandleFunc("/patterns/department", GetDepartmentPatterns).Methods("GET", "OPTIONS")
	
	// Authority access routes (requires authentication)
	api.HandleFunc("/authority/complaints", GetAuthorityComplaints).Methods("GET", "OPTIONS")
	api.HandleFunc("/authority/decrypt", DecryptComplaint).Methods("POST", "OPTIONS")
	
	// Health check
	router.HandleFunc("/health", HealthCheck).Methods("GET")

	// Middleware
	router.Use(loggingMiddleware)
	router.Use(securityHeadersMiddleware)

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173"}, // React dev servers
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	handler := c.Handler(router)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Aawaaj API Server starting on port %s", port)
	log.Printf("🔒 Zero-trust architecture enabled")
	log.Printf("🛡️ CORS enabled for React frontend")
	
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// Middleware for request logging
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.Method, r.RequestURI, r.RemoteAddr)
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

// Health check endpoint
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "healthy", "service": "aawaaj-api", "version": "1.0.0"}`))
}
