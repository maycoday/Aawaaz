package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// InitDatabase initializes and returns a database connection
func InitDatabase() (*sql.DB, error) {
	// Try using DATABASE_URL first (preferred for Supabase)
	var connStr string
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		connStr = dbURL
		log.Println("🔗 Using DATABASE_URL for connection")
	} else {
		// Fallback to individual config components
		config := getDatabaseConfig()
		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			config.Host,
			config.Port,
			config.User,
			config.Password,
			config.DBName,
			config.SSLMode,
		)
		log.Println("🔗 Using individual DB config")
	}

	// Open database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Database connection established")
	return db, nil
}

// getDatabaseConfig reads database configuration from environment
func getDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "postgres"),
		Password: getEnv("DB_PASSWORD", ""),
		DBName:   getEnv("DB_NAME", "aawaaj"),
		SSLMode:  getEnv("DB_SSL_MODE", "disable"),
	}
}

// getEnv retrieves environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// RunMigrations runs database migrations (optional)
func RunMigrations(db *sql.DB) error {
	// In production: Use a proper migration tool like golang-migrate
	// For now, just verify tables exist
	
	query := `
		SELECT COUNT(*) 
		FROM information_schema.tables 
		WHERE table_name IN ('complaints', 'authorities', 'encrypted_keys')
	`
	
	var count int
	err := db.QueryRow(query).Scan(&count)
	if err != nil {
		return fmt.Errorf("migration check failed: %w", err)
	}
	
	if count < 3 {
		log.Println("⚠️  Database tables not found. Please run database_schema.sql")
		return fmt.Errorf("required tables missing")
	}
	
	log.Println("✅ Database schema verified")
	return nil
}
