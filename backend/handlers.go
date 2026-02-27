package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// ============================================
// COMPLAINT HANDLERS
// ============================================

// CreateComplaint handles encrypted complaint submission
func CreateComplaint(w http.ResponseWriter, r *http.Request) {
	var complaint ComplaintPayload

	if err := json.NewDecoder(r.Body).Decode(&complaint); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate payload
	if complaint.EncryptedData == "" || complaint.IV == "" || len(complaint.EncryptedKeys) == 0 {
		respondWithError(w, http.StatusBadRequest, "Missing required encrypted fields")
		return
	}

	// Generate reference code
	complaint.ReferenceCode = generateReferenceCode()
	complaint.SubmittedAt = time.Now()
	complaint.Status = "pending"

	// Store in database (mock for demo)
	// In production: db.Create(&complaint)

	log.Printf("✅ Complaint received: %s | Authorities: %d | Type: %s",
		complaint.ReferenceCode,
		len(complaint.EncryptedKeys),
		complaint.Metadata.IncidentType)

	// Trigger pattern detection
	go detectPattern(complaint.Metadata)

	// Return success response
	response := map[string]interface{}{
		"success":        true,
		"referenceCode":  complaint.ReferenceCode,
		"submittedAt":    complaint.SubmittedAt,
		"message":        "Complaint encrypted and stored successfully",
		"authorityCount": len(complaint.EncryptedKeys),
	}

	respondWithJSON(w, http.StatusCreated, response)
}

// GetComplaint retrieves a complaint by reference code (for authority access)
func GetComplaint(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// In production: Verify authority authentication
	// Check if requesting authority has access to this complaint

	// Mock response
	complaint := map[string]interface{}{
		"id":            id,
		"encryptedData": "base64_encrypted_data...",
		"iv":            "base64_iv...",
		"status":        "pending",
		"submittedAt":   time.Now().Add(-24 * time.Hour),
	}

	respondWithJSON(w, http.StatusOK, complaint)
}

// ListComplaints returns list of complaints (metadata only, for pattern analysis)
func ListComplaints(w http.ResponseWriter, r *http.Request) {
	// Return only anonymized metadata for pattern detection
	complaints := []map[string]interface{}{
		{
			"incidentType": "sexual_harassment",
			"department":   "engineering",
			"timestamp":    time.Now().Add(-48 * time.Hour),
		},
		{
			"incidentType": "discrimination",
			"department":   "sales",
			"timestamp":    time.Now().Add(-72 * time.Hour),
		},
	}

	respondWithJSON(w, http.StatusOK, complaints)
}

// ============================================
// AUTHORITY HANDLERS
// ============================================

// ListAuthorities returns available authorities
func ListAuthorities(w http.ResponseWriter, r *http.Request) {
	authorities := []Authority{
		{
			ID:           "hr-001",
			Type:         "hr",
			Name:         "Human Resources Department",
			Organization: "TechCorp",
			PublicKey:    "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
			IsActive:     true,
		},
		{
			ID:           "icc-001",
			Type:         "icc",
			Name:         "Internal Complaints Committee",
			Organization: "TechCorp ICC",
			PublicKey:    "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
			IsActive:     true,
		},
		{
			ID:           "ngo-001",
			Type:         "ngo",
			Name:         "SafeWorkplace Foundation",
			Organization: "SafeWorkplace NGO",
			PublicKey:    "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
			IsActive:     true,
		},
		{
			ID:           "legal-001",
			Type:         "legal",
			Name:         "National Commission for Women",
			Organization: "NCW",
			PublicKey:    "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
			IsActive:     false,
		},
	}

	respondWithJSON(w, http.StatusOK, authorities)
}

// GetAuthority returns details of a specific authority
func GetAuthority(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	authority := Authority{
		ID:           id,
		Type:         "icc",
		Name:         "Internal Complaints Committee",
		Organization: "TechCorp ICC",
		PublicKey:    "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
		IsActive:     true,
	}

	respondWithJSON(w, http.StatusOK, authority)
}

// ============================================
// PATTERN DETECTION HANDLERS
// ============================================

// GetPatterns returns detected patterns
func GetPatterns(w http.ResponseWriter, r *http.Request) {
	patterns := []PatternMetadata{
		{
			PatternHash:     "abc123",
			IncidentType:    "sexual_harassment",
			Department:      "engineering",
			OccurrenceCount: 3,
			SeverityScore:   0.75,
			AlertTriggered:  true,
			FirstDetected:   time.Now().Add(-168 * time.Hour), // 1 week ago
			LastUpdated:     time.Now().Add(-24 * time.Hour),
		},
		{
			PatternHash:     "def456",
			IncidentType:    "verbal_harassment",
			Department:      "sales",
			OccurrenceCount: 2,
			SeverityScore:   0.50,
			AlertTriggered:  false,
			FirstDetected:   time.Now().Add(-72 * time.Hour),
			LastUpdated:     time.Now(),
		},
	}

	respondWithJSON(w, http.StatusOK, patterns)
}

// GetDepartmentPatterns returns patterns grouped by department
func GetDepartmentPatterns(w http.ResponseWriter, r *http.Request) {
	departmentStats := map[string]interface{}{
		"engineering": map[string]int{
			"sexual_harassment": 3,
			"discrimination":    1,
			"total":             4,
		},
		"sales": map[string]int{
			"verbal_harassment": 2,
			"bullying":          1,
			"total":             3,
		},
		"marketing": map[string]int{
			"discrimination": 1,
			"total":          1,
		},
	}

	respondWithJSON(w, http.StatusOK, departmentStats)
}

// ============================================
// AUTHORITY ACCESS HANDLERS (Requires Auth)
// ============================================

// GetAuthorityComplaints returns complaints assigned to authenticated authority
func GetAuthorityComplaints(w http.ResponseWriter, r *http.Request) {
	// In production: Extract authority ID from JWT token
	// authorityID := getAuthorityFromToken(r)

	complaints := []map[string]interface{}{
		{
			"referenceCode": "ABCD-1234-EFGH",
			"status":        "pending",
			"submittedAt":   time.Now().Add(-48 * time.Hour),
			"hasAccess":     true,
		},
		{
			"referenceCode": "WXYZ-5678-IJKL",
			"status":        "under_review",
			"submittedAt":   time.Now().Add(-96 * time.Hour),
			"hasAccess":     true,
		},
	}

	respondWithJSON(w, http.StatusOK, complaints)
}

// DecryptComplaint handles decryption request from authority
func DecryptComplaint(w http.ResponseWriter, r *http.Request) {
	var req DecryptRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// In production:
	// 1. Verify authority authentication
	// 2. Check if authority has access to this complaint
	// 3. Return encrypted symmetric key for this authority
	// 4. Authority decrypts on their end using private key
	// 5. Log access in audit trail

	response := map[string]interface{}{
		"success":       true,
		"encryptedKey":  "base64_encrypted_symmetric_key...",
		"encryptedData": "base64_encrypted_complaint_data...",
		"iv":            "base64_iv...",
		"message":       "Encrypted data retrieved. Decrypt with your private key.",
		"accessLogged":  true,
	}

	log.Printf("🔓 Authority access logged for complaint: %s", req.ComplaintID)

	respondWithJSON(w, http.StatusOK, response)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Internal server error"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func generateReferenceCode() string {
	// Simple reference code generation
	// In production: Use crypto/rand for secure generation
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := ""
	for i := 0; i < 12; i++ {
		code += string(chars[i%len(chars)])
		if (i+1)%4 == 0 && i < 11 {
			code += "-"
		}
	}
	return code
}

func detectPattern(metadata ComplaintMetadata) {
	// Pattern detection logic
	// In production: Query database for similar incidents
	// Check time windows, departments, incident types
	// Trigger alerts if threshold exceeded

	log.Printf("🔍 Pattern detection running for: %s in %s",
		metadata.IncidentType,
		metadata.Department)
}
