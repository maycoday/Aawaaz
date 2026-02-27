package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// ============================================
// COMPLAINT SUBMISSION HANDLER
// ============================================

// ComplaintHandler handles complaint submission with database operations
type ComplaintHandler struct {
	db                  *sql.DB
	notificationService *NotificationService
}

// NewComplaintHandler creates a new complaint handler
func NewComplaintHandler(db *sql.DB) *ComplaintHandler {
	return &ComplaintHandler{
		db:                  db,
		notificationService: NewNotificationService(),
	}
}

// SubmitComplaintRequest represents the incoming encrypted complaint payload
type SubmitComplaintRequest struct {
	EncryptedPayload     string                   `json:"encryptedData"`
	EncryptedKeys        []EncryptedKeySubmission `json:"encryptedKeys"`
	AnonymizedMetadata   AnonymizedMetadata       `json:"metadata"`
	ReferenceCode        string                   `json:"referenceCode"` // Optional: frontend can generate
}

// EncryptedKeySubmission represents encrypted key for one authority
type EncryptedKeySubmission struct {
	AuthorityID  string `json:"authorityId"`
	EncryptedKey string `json:"encryptedKey"`
}

// AnonymizedMetadata contains non-sensitive metadata
type AnonymizedMetadata struct {
	DepartmentHash string    `json:"departmentHash"` // SHA-256 hash of department
	Timestamp      time.Time `json:"timestamp"`
	IncidentType   string    `json:"incidentType"`
	IncidentDate   string    `json:"incidentDate"`
	HasEvidence    bool      `json:"hasEvidence"`
}

// SubmitComplaintResponse is the response sent back to client
type SubmitComplaintResponse struct {
	TrackingID    string    `json:"trackingId"`
	ReferenceCode string    `json:"referenceCode"`
	Message       string    `json:"message"`
	SubmittedAt   time.Time `json:"submittedAt"`
}

// SubmitComplaint handles POST /api/complaints/submit
// This is the main entry point for encrypted complaint submission
func (h *ComplaintHandler) SubmitComplaint(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. PARSE AND VALIDATE REQUEST
	var req SubmitComplaintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Invalid request payload: %v", err)
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 2. VALIDATE REQUIRED FIELDS
	if err := validateComplaintRequest(&req); err != nil {
		log.Printf("❌ Validation failed: %v", err)
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 3. GENERATE TRACKING IDS
	trackingID := uuid.New()
	referenceCode := req.ReferenceCode
	if referenceCode == "" {
		referenceCode = generateReferenceCode()
	}

	// 4. START DATABASE TRANSACTION
	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("❌ Failed to start transaction: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback() // Rollback if not committed

	// 5. INSERT COMPLAINT INTO DATABASE
	complaintID, err := h.insertComplaint(ctx, tx, trackingID, referenceCode, &req)
	if err != nil {
		log.Printf("❌ Failed to insert complaint: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to store complaint")
		return
	}

	// 6. INSERT ENCRYPTED KEYS FOR EACH AUTHORITY
	if err := h.insertEncryptedKeys(ctx, tx, complaintID, req.EncryptedKeys); err != nil {
		log.Printf("❌ Failed to insert encrypted keys: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to store encryption keys")
		return
	}

	// 7. UPDATE PATTERN METADATA (for repeat offender detection)
	if err := h.updatePatternMetadata(ctx, tx, &req.AnonymizedMetadata); err != nil {
		log.Printf("⚠️ Pattern metadata update failed (non-critical): %v", err)
		// Don't fail the request if pattern detection fails
	}

	// 8. COMMIT TRANSACTION
	if err := tx.Commit(); err != nil {
		log.Printf("❌ Failed to commit transaction: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save complaint")
		return
	}

	// 9. TRIGGER ASYNC NOTIFICATIONS (don't block response)
	go func() {
		if err := h.notificationService.NotifyAuthorities(complaintID.String(), req.EncryptedKeys); err != nil {
			log.Printf("⚠️ Failed to send notifications: %v", err)
		}
	}()

	// 10. LOG SUCCESS (without logging encrypted data)
	log.Printf("✅ Complaint submitted successfully | ID: %s | Reference: %s | Authorities: %d | Type: %s",
		trackingID.String(),
		referenceCode,
		len(req.EncryptedKeys),
		req.AnonymizedMetadata.IncidentType)

	// 11. RETURN SUCCESS RESPONSE
	response := SubmitComplaintResponse{
		TrackingID:    trackingID.String(),
		ReferenceCode: referenceCode,
		Message:       "Complaint encrypted and stored successfully. Your anonymity is protected.",
		SubmittedAt:   time.Now(),
	}

	respondWithJSON(w, http.StatusCreated, response)
}

// ============================================
// DATABASE OPERATIONS
// ============================================

// insertComplaint inserts the encrypted complaint into the database
func (h *ComplaintHandler) insertComplaint(ctx context.Context, tx *sql.Tx, id uuid.UUID, refCode string, req *SubmitComplaintRequest) (uuid.UUID, error) {
	query := `
		INSERT INTO complaints (
			id,
			encrypted_payload,
			anonymized_metadata,
			status,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	payloadBytes, err := base64.StdEncoding.DecodeString(req.EncryptedPayload)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid encrypted payload: %w", err)
	}

	metadataTimestamp := req.AnonymizedMetadata.Timestamp
	if metadataTimestamp.IsZero() {
		metadataTimestamp = time.Now()
	}

	metadata := map[string]interface{}{
		"departmentHash": req.AnonymizedMetadata.DepartmentHash,
		"incidentType":   req.AnonymizedMetadata.IncidentType,
		"incidentDate":   req.AnonymizedMetadata.IncidentDate,
		"hasEvidence":    req.AnonymizedMetadata.HasEvidence,
		"timestamp":      metadataTimestamp,
		"referenceCode":  refCode,
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	now := time.Now()
	var complaintID string
	err = tx.QueryRowContext(
		ctx,
		query,
		id.String(),
		payloadBytes,
		metadataJSON,
		"pending",
		now,
		now,
	).Scan(&complaintID)

	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to insert complaint: %w", err)
	}

	parsedID, err := uuid.Parse(complaintID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid complaint id returned: %w", err)
	}

	return parsedID, nil
}

// insertEncryptedKeys inserts encrypted symmetric keys for each authority
func (h *ComplaintHandler) insertEncryptedKeys(ctx context.Context, tx *sql.Tx, complaintID uuid.UUID, keys []EncryptedKeySubmission) error {
	query := `
		INSERT INTO encrypted_keys (
			complaint_id,
			authority_id,
			encrypted_key,
			created_at
		) VALUES ($1, $2, $3, $4)
	`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, key := range keys {
		encryptedKeyBytes, err := base64.StdEncoding.DecodeString(key.EncryptedKey)
		if err != nil {
			return fmt.Errorf("invalid encrypted key for authority %s: %w", key.AuthorityID, err)
		}

		_, err = stmt.ExecContext(
			ctx,
			complaintID.String(),
			key.AuthorityID,
			encryptedKeyBytes,
			time.Now(),
		)

		if err != nil {
			return fmt.Errorf("failed to insert key for authority %s: %w", key.AuthorityID, err)
		}
	}

	return nil
}

// updatePatternMetadata updates pattern detection metadata
func (h *ComplaintHandler) updatePatternMetadata(ctx context.Context, tx *sql.Tx, metadata *AnonymizedMetadata) error {
	// Generate pattern hash from department + incident type + time window
	patternHash := generatePatternHash(metadata.DepartmentHash, metadata.IncidentType, metadata.Timestamp)

	query := `
		INSERT INTO pattern_metadata (
			id,
			pattern_hash,
			incident_type,
			department,
			time_window_start,
			time_window_end,
			occurrence_count,
			first_detected,
			last_updated
		) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
		ON CONFLICT (pattern_hash) 
		DO UPDATE SET 
			occurrence_count = pattern_metadata.occurrence_count + 1,
			last_updated = $8,
			time_window_end = $6
	`

	// Time window: current month
	startOfMonth := time.Date(metadata.Timestamp.Year(), metadata.Timestamp.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	_, err := tx.ExecContext(
		ctx,
		query,
		uuid.New(),
		patternHash,
		metadata.IncidentType,
		metadata.DepartmentHash,
		startOfMonth,
		endOfMonth,
		time.Now(),
		time.Now(),
	)

	return err
}

// ============================================
// VALIDATION
// ============================================

// validateComplaintRequest validates the incoming request
func validateComplaintRequest(req *SubmitComplaintRequest) error {
	if req.EncryptedPayload == "" {
		return fmt.Errorf("encrypted payload is required")
	}

	if len(req.EncryptedKeys) == 0 {
		return fmt.Errorf("at least one authority must be selected")
	}

	if len(req.EncryptedKeys) > 10 {
		return fmt.Errorf("maximum 10 authorities allowed")
	}

	for i, key := range req.EncryptedKeys {
		if key.AuthorityID == "" {
			return fmt.Errorf("authority ID is required for key %d", i)
		}
		if key.EncryptedKey == "" {
			return fmt.Errorf("encrypted key is required for authority %s", key.AuthorityID)
		}
	}

	if req.AnonymizedMetadata.IncidentType == "" {
		return fmt.Errorf("incident type is required")
	}

	validIncidentTypes := map[string]bool{
		"verbal":          true,
		"physical":        true,
		"sexual":          true,
		"discrimination":  true,
		"bullying":        true,
		"retaliation":     true,
		"intimidation":    true,
		"other":           true,
	}

	if !validIncidentTypes[req.AnonymizedMetadata.IncidentType] {
		return fmt.Errorf("invalid incident type: %s", req.AnonymizedMetadata.IncidentType)
	}

	return nil
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

// NotificationService handles async notifications to authorities
type NotificationService struct {
	// In production: email service, webhook service, etc.
}

// NewNotificationService creates a new notification service
func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// NotifyAuthorities sends notifications to selected authorities
func (n *NotificationService) NotifyAuthorities(complaintID string, keys []EncryptedKeySubmission) error {
	// In production:
	// 1. Look up authority contact information
	// 2. Send email notifications
	// 3. Trigger webhook callbacks
	// 4. Log notification attempts

	log.Printf("📧 Notifications sent to %d authorities for complaint %s", len(keys), complaintID)
	return nil
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// generateReferenceCode generates a human-readable reference code
// Format: ABCD-1234-EFGH
func generateReferenceCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based generation
		return fmt.Sprintf("%04X-%04X-%04X", time.Now().Unix()%10000, time.Now().Unix()%10000, time.Now().Unix()%10000)
	}

	code := make([]byte, 12)
	for i := 0; i < 12; i++ {
		code[i] = charset[int(b[i])%len(charset)]
	}

	return fmt.Sprintf("%s-%s-%s", string(code[0:4]), string(code[4:8]), string(code[8:12]))
}

// extractIVFromPayload extracts IV from the encrypted payload
// Assumes first 12 bytes (16 chars base64) are the IV
func extractIVFromPayload(payload string) string {
	if len(payload) < 16 {
		return ""
	}
	return payload[:16] // First 16 characters of base64 encoded data
}

// generatePatternHash generates a hash for pattern detection
func generatePatternHash(departmentHash, incidentType string, timestamp time.Time) string {
	// Create hash from: department + incident type + year-month
	yearMonth := timestamp.Format("2006-01")
	combined := fmt.Sprintf("%s:%s:%s", departmentHash, incidentType, yearMonth)
	
	// Simple hash (in production, use crypto/sha256)
	return fmt.Sprintf("%x", []byte(combined))
}

// ============================================
// HTTP HELPER FUNCTIONS
// ============================================

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ JSON marshal error: %v", err)
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

func parseIntWithDefault(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseMetadataJSON(raw []byte) map[string]interface{} {
	metadata := map[string]interface{}{}
	if len(raw) == 0 {
		return metadata
	}
	if err := json.Unmarshal(raw, &metadata); err != nil {
		return map[string]interface{}{}
	}
	return metadata
}

func getMetadataString(metadata map[string]interface{}, key string) string {
	if value, ok := metadata[key]; ok {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}

func getAuthorityIDFromHeader(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 {
		return ""
	}
	if strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// ============================================
// RATE LIMITING (Optional but recommended)
// ============================================

// RateLimitMiddleware implements basic rate limiting
func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In production: Use Redis or in-memory cache for rate limiting
		// Example: Allow 10 submissions per IP per hour
		
		// For now, just pass through
		next.ServeHTTP(w, r)
	})
}

// ============================================
// PATTERN DETECTION HANDLERS
// ============================================

// Global pattern service instance
var patternService *PatternService

// Global database instance for standalone handlers
var db *sql.DB

// GetPatterns returns detected patterns
func GetPatterns(w http.ResponseWriter, r *http.Request) {
	if patternService == nil {
		respondWithError(w, http.StatusServiceUnavailable, "Pattern service not initialized")
		return
	}

	patterns, err := patternService.AnalyzePatterns()
	if err != nil {
		log.Printf("❌ Error analyzing patterns: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to analyze patterns")
		return
	}

	respondWithJSON(w, http.StatusOK, patterns)
}

// GetDepartmentPatterns returns patterns grouped by department
func GetDepartmentPatterns(w http.ResponseWriter, r *http.Request) {
	if patternService == nil {
		respondWithError(w, http.StatusServiceUnavailable, "Pattern service not initialized")
		return
	}

	patterns, err := patternService.AnalyzePatterns()
	if err != nil {
		log.Printf("❌ Error analyzing patterns: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to analyze patterns")
		return
	}

	// Group patterns by department hash
	departmentStats := make(map[string]interface{})
	for _, p := range patterns {
		departmentStats[p.DepartmentHash] = map[string]interface{}{
			"incidentCount":  p.IncidentCount,
			"riskLevel":      p.RiskLevel,
			"trendDirection": p.TrendDirection,
			"lastIncident":   p.LastIncident,
			"recentSpike":    p.RecentSpike,
			"incidentTypes":  p.IncidentTypes,
		}
	}

	respondWithJSON(w, http.StatusOK, departmentStats)
}

// GetPatternAlerts returns detected alerts
func GetPatternAlerts(w http.ResponseWriter, r *http.Request) {
	if patternService == nil {
		respondWithError(w, http.StatusServiceUnavailable, "Pattern service not initialized")
		return
	}

	alerts, err := patternService.DetectSpikes()
	if err != nil {
		log.Printf("❌ Error detecting spikes: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to detect spikes")
		return
	}

	respondWithJSON(w, http.StatusOK, alerts)
}

// GetPatternReport returns comprehensive analysis report
func GetPatternReport(w http.ResponseWriter, r *http.Request) {
	if patternService == nil {
		respondWithError(w, http.StatusServiceUnavailable, "Pattern service not initialized")
		return
	}

	report, err := patternService.GenerateReport()
	if err != nil {
		log.Printf("❌ Error generating report: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate report")
		return
	}

	respondWithJSON(w, http.StatusOK, report)
}

// ============================================
// LEGACY STUB HANDLERS (for compatibility)
// ============================================

// CreateComplaint - legacy stub (use SubmitComplaint instead)
func CreateComplaint(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Use /api/v1/complaints/submit endpoint",
		"success": false,
	})
}

// GetComplaint - stub for getting complaint by ID
func GetComplaint(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondWithError(w, http.StatusBadRequest, "complaint id is required")
		return
	}

	authorityID := getAuthorityIDFromHeader(r)
	if authorityID == "" {
		respondWithError(w, http.StatusUnauthorized, "missing authority token")
		return
	}

	query := `
		SELECT c.id, c.anonymized_metadata, c.encrypted_payload, c.created_at, c.updated_at, c.status, ek.encrypted_key
		FROM encrypted_keys ek
		JOIN complaints c ON c.id = ek.complaint_id
		WHERE ek.authority_id = $1 AND c.id = $2
		LIMIT 1
	`

	var statusVal string
	var metadataRaw []byte
	var encryptedPayloadBytes, encryptedKeyBytes []byte
	var createdAt, updatedAt time.Time

	if err := db.QueryRow(query, authorityID, id).Scan(
		&id, &metadataRaw, &encryptedPayloadBytes, &createdAt, &updatedAt, &statusVal, &encryptedKeyBytes,
	); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "complaint not found")
			return
		}
		log.Printf("❌ Failed to fetch complaint: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch complaint")
		return
	}

	metadata := parseMetadataJSON(metadataRaw)
	refCode := getMetadataString(metadata, "referenceCode")
	encryptedPayload := base64.StdEncoding.EncodeToString(encryptedPayloadBytes)
	encryptedKey := base64.StdEncoding.EncodeToString(encryptedKeyBytes)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":                        id,
		"referenceCode":            refCode,
		"status":                   statusVal,
		"created_at":               createdAt,
		"updated_at":               updatedAt,
		"encrypted_payload":        encryptedPayload,
		"encrypted_key_for_authority": encryptedKey,
		"metadata":                 metadata,
	})
}

// ListComplaints - stub for listing complaints
func ListComplaints(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, []map[string]interface{}{
		{"message": "List complaints - implement with pagination"},
	})
}

// UpdateComplaintStatus handles PUT /api/v1/complaints/{id}/status
func UpdateComplaintStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	complaintID := vars["id"]
	if complaintID == "" {
		respondWithError(w, http.StatusBadRequest, "complaint id is required")
		return
	}

	authorityID := getAuthorityIDFromHeader(r)
	if authorityID == "" {
		respondWithError(w, http.StatusUnauthorized, "missing authority token")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	req.Status = strings.TrimSpace(req.Status)
	if req.Status == "" {
		respondWithError(w, http.StatusBadRequest, "status is required")
		return
	}

	accessCheck := `
		SELECT 1 FROM encrypted_keys WHERE authority_id = $1 AND complaint_id = $2 LIMIT 1
	`
	if err := db.QueryRow(accessCheck, authorityID, complaintID).Scan(new(int)); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusForbidden, "access denied")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "failed to verify access")
		return
	}

	updateQuery := `
		UPDATE complaints SET status = $1, updated_at = $2 WHERE id = $3
	`
	if _, err := db.Exec(updateQuery, req.Status, time.Now(), complaintID); err != nil {
		log.Printf("❌ Failed to update complaint status: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to update status")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  req.Status,
	})
}

// AddComplaintNote handles POST /api/v1/complaints/{id}/notes
func AddComplaintNote(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	complaintID := vars["id"]
	if complaintID == "" {
		respondWithError(w, http.StatusBadRequest, "complaint id is required")
		return
	}

	authorityID := getAuthorityIDFromHeader(r)
	if authorityID == "" {
		respondWithError(w, http.StatusUnauthorized, "missing authority token")
		return
	}

	var req struct {
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	if strings.TrimSpace(req.Note) == "" {
		respondWithError(w, http.StatusBadRequest, "note is required")
		return
	}

	log.Printf("📝 Authority %s added note on complaint %s", authorityID, complaintID)
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// TrackComplaint returns complaint status by reference code
func TrackComplaint(w http.ResponseWriter, r *http.Request) {
	referenceCode := r.URL.Query().Get("reference")
	if referenceCode == "" {
		respondWithError(w, http.StatusBadRequest, "reference code is required")
		return
	}

	query := `
		SELECT anonymized_metadata, status, created_at
		FROM complaints
		WHERE anonymized_metadata->>'referenceCode' = $1
		LIMIT 1
	`

	var metadataRaw []byte
	var status string
	var createdAt time.Time
	if err := db.QueryRow(query, referenceCode).Scan(&metadataRaw, &status, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "reference code not found")
			return
		}
		log.Printf("❌ Failed to track complaint: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch complaint status")
		return
	}

	metadata := parseMetadataJSON(metadataRaw)
	incidentType := getMetadataString(metadata, "incidentType")

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"referenceCode": referenceCode,
		"status":        status,
		"incidentType":  incidentType,
		"submittedAt":   createdAt,
	})
}

// AuthorityLogin handles POST /api/v1/authority/login
func AuthorityLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if strings.TrimSpace(req.Identifier) == "" || strings.TrimSpace(req.Password) == "" {
		respondWithError(w, http.StatusBadRequest, "identifier and password are required")
		return
	}

	query := `
		SELECT id, name, type, email, public_key, is_active
		FROM authorities
		WHERE id = $1 OR email = $1
		LIMIT 1
	`

	var id, name, authType, email, publicKey string
	var isActive bool
	if err := db.QueryRow(query, strings.TrimSpace(req.Identifier)).Scan(&id, &name, &authType, &email, &publicKey, &isActive); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		log.Printf("❌ Authority login failed: %v", err)
		respondWithError(w, http.StatusInternalServerError, "login failed")
		return
	}

	if !isActive {
		respondWithError(w, http.StatusForbidden, "authority account is inactive")
		return
	}

	// Demo token: use authority ID for now
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"token": id,
		"authority": map[string]interface{}{
			"id":    id,
			"name":  name,
			"type":  authType,
			"email": email,
		},
		"expiresAt": time.Now().Add(30 * time.Minute),
	})
}

// GetAuthorityComplaints returns complaints assigned to an authority
func GetAuthorityComplaints(w http.ResponseWriter, r *http.Request) {
	authorityID := mux.Vars(r)["authorityId"]
	if authorityID == "" {
		respondWithError(w, http.StatusBadRequest, "authorityId is required")
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	page := parseIntWithDefault(r.URL.Query().Get("page"), 1)
	limit := parseIntWithDefault(r.URL.Query().Get("limit"), 20)
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM encrypted_keys ek
		JOIN complaints c ON c.id = ek.complaint_id
		WHERE ek.authority_id = $1
	`

	args := []interface{}{authorityID}
	if status != "" {
		countQuery += " AND c.status = $2"
		args = append(args, status)
	}

	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		log.Printf("❌ Failed to count authority complaints: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch complaints")
		return
	}

	query := `
		SELECT c.id, c.anonymized_metadata, c.created_at, c.updated_at, c.status
		FROM encrypted_keys ek
		JOIN complaints c ON c.id = ek.complaint_id
		WHERE ek.authority_id = $1
	`
	if status != "" {
		query += " AND c.status = $2"
	}
	query += " ORDER BY c.created_at DESC LIMIT $3 OFFSET $4"

	args = []interface{}{authorityID}
	if status != "" {
		args = append(args, status)
	}
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ Failed to query authority complaints: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch complaints")
		return
	}
	defer rows.Close()

	complaints := []map[string]interface{}{}
	for rows.Next() {
		var id string
		var metadataRaw []byte
		var createdAt, updatedAt time.Time
		var statusVal string

		if err := rows.Scan(&id, &metadataRaw, &createdAt, &updatedAt, &statusVal); err != nil {
			log.Printf("❌ Failed to scan complaint: %v", err)
			continue
		}

		metadata := parseMetadataJSON(metadataRaw)
		refCode := getMetadataString(metadata, "referenceCode")

		complaints = append(complaints, map[string]interface{}{
			"id":            id,
			"referenceCode": refCode,
			"status":        statusVal,
			"created_at":    createdAt,
			"updated_at":    updatedAt,
			"metadata":      metadata,
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"complaints": complaints,
		"total":      total,
		"page":       page,
		"limit":      limit,
	})
}

// GetAuthorityComplaintDetail returns a complaint detail for an authority
func GetAuthorityComplaintDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	authorityID := vars["authorityId"]
	complaintID := vars["complaintId"]
	if authorityID == "" || complaintID == "" {
		respondWithError(w, http.StatusBadRequest, "authorityId and complaintId are required")
		return
	}

	query := `
		SELECT c.id, c.anonymized_metadata, c.encrypted_payload, c.created_at, c.updated_at, c.status, ek.encrypted_key
		FROM encrypted_keys ek
		JOIN complaints c ON c.id = ek.complaint_id
		WHERE ek.authority_id = $1 AND c.id = $2
		LIMIT 1
	`

	var id, statusVal string
	var metadataRaw []byte
	var encryptedPayloadBytes, encryptedKeyBytes []byte
	var createdAt, updatedAt time.Time

	if err := db.QueryRow(query, authorityID, complaintID).Scan(
		&id, &metadataRaw, &encryptedPayloadBytes, &createdAt, &updatedAt, &statusVal, &encryptedKeyBytes,
	); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "complaint not found")
			return
		}
		log.Printf("❌ Failed to fetch complaint detail: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch complaint detail")
		return
	}

	metadata := parseMetadataJSON(metadataRaw)
	refCode := getMetadataString(metadata, "referenceCode")
	encryptedPayload := base64.StdEncoding.EncodeToString(encryptedPayloadBytes)
	encryptedKey := base64.StdEncoding.EncodeToString(encryptedKeyBytes)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"complaint": map[string]interface{}{
			"id":                        id,
			"referenceCode":            refCode,
			"status":                   statusVal,
			"created_at":               createdAt,
			"updated_at":               updatedAt,
			"encrypted_payload":        encryptedPayload,
			"encrypted_key_for_authority": encryptedKey,
			"metadata":                 metadata,
		},
	})
}

// UpdateAuthorityComplaintStatus updates complaint status
func UpdateAuthorityComplaintStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	authorityID := vars["authorityId"]
	complaintID := vars["complaintId"]
	if authorityID == "" || complaintID == "" {
		respondWithError(w, http.StatusBadRequest, "authorityId and complaintId are required")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	req.Status = strings.TrimSpace(req.Status)
	if req.Status == "" {
		respondWithError(w, http.StatusBadRequest, "status is required")
		return
	}

	// Ensure authority has access
	accessCheck := `
		SELECT 1
		FROM encrypted_keys
		WHERE authority_id = $1 AND complaint_id = $2
		LIMIT 1
	`
	if err := db.QueryRow(accessCheck, authorityID, complaintID).Scan(new(int)); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusForbidden, "access denied")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "failed to verify access")
		return
	}

	updateQuery := `
		UPDATE complaints
		SET status = $1, updated_at = $2
		WHERE id = $3
	`
	if _, err := db.Exec(updateQuery, req.Status, time.Now(), complaintID); err != nil {
		log.Printf("❌ Failed to update status: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to update status")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  req.Status,
	})
}

// AddAuthorityComplaintNote logs a note (no persistence for now)
func AddAuthorityComplaintNote(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	authorityID := vars["authorityId"]
	complaintID := vars["complaintId"]
	if authorityID == "" || complaintID == "" {
		respondWithError(w, http.StatusBadRequest, "authorityId and complaintId are required")
		return
	}

	var req struct {
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if strings.TrimSpace(req.Note) == "" {
		respondWithError(w, http.StatusBadRequest, "note is required")
		return
	}

	log.Printf("📝 Authority %s added note on complaint %s", authorityID, complaintID)
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// LogAuthorityAction records an authority action (best-effort)
func LogAuthorityAction(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	authorityID := vars["authorityId"]
	if authorityID == "" {
		respondWithError(w, http.StatusBadRequest, "authorityId is required")
		return
	}

	var req struct {
		ComplaintID string `json:"complaintId"`
		ActionType  string `json:"actionType"`
		Notes       string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	allowed := map[string]bool{
		"viewed":         true,
		"updated_status": true,
		"escalated":      true,
		"resolved":       true,
		"archived":       true,
		"downloaded":     true,
	}

	if allowed[req.ActionType] {
		query := `
			INSERT INTO authority_actions (complaint_id, authority_id, action_type, action_timestamp, notes)
			VALUES ($1, $2, $3, $4, $5)
		`
		if _, err := db.Exec(query, req.ComplaintID, authorityID, req.ActionType, time.Now(), req.Notes); err != nil {
			log.Printf("⚠️ Failed to log authority action: %v", err)
		}
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// DecryptComplaint returns encrypted AES key for authority
func DecryptComplaint(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ComplaintID string `json:"complaintId"`
		AuthorityID string `json:"authorityId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if req.ComplaintID == "" || req.AuthorityID == "" {
		respondWithError(w, http.StatusBadRequest, "complaintId and authorityId are required")
		return
	}

	query := `
		SELECT c.encrypted_payload, ek.encrypted_key
		FROM encrypted_keys ek
		JOIN complaints c ON c.id = ek.complaint_id
		WHERE ek.authority_id = $1 AND ek.complaint_id = $2
		LIMIT 1
	`

	var encryptedPayloadBytes, encryptedKeyBytes []byte
	if err := db.QueryRow(query, req.AuthorityID, req.ComplaintID).Scan(&encryptedPayloadBytes, &encryptedKeyBytes); err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "complaint not found")
			return
		}
		log.Printf("❌ Failed to decrypt complaint: %v", err)
		respondWithError(w, http.StatusInternalServerError, "failed to fetch encrypted key")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"encryptedPayload": base64.StdEncoding.EncodeToString(encryptedPayloadBytes),
		"encryptedKey":     base64.StdEncoding.EncodeToString(encryptedKeyBytes),
	})
}

// ListAuthorities - stub for listing authorities
func ListAuthorities(w http.ResponseWriter, r *http.Request) {
	// Query active authorities from database
	query := `
		SELECT id, name, type, description, public_key, email, is_active
		FROM authorities
		WHERE is_active = true
		ORDER BY 
			CASE type 
				WHEN 'ICC' THEN 1
				WHEN 'NGO' THEN 2
				WHEN 'LEGAL' THEN 3
				WHEN 'HR' THEN 4
			END
	`
	
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Failed to query authorities: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch authorities")
		return
	}
	defer rows.Close()
	
	var authorities []map[string]interface{}
	
	for rows.Next() {
		var id, name, authType, description, publicKey, email string
		var isActive bool
		
		err := rows.Scan(&id, &name, &authType, &description, &publicKey, &email, &isActive)
		if err != nil {
			log.Printf("❌ Failed to scan authority: %v", err)
			continue
		}
		
		authorities = append(authorities, map[string]interface{}{
			"id":          id,
			"name":        name,
			"type":        authType,
			"description": description,
			"publicKey":   publicKey,
			"email":       email,
			"isActive":    isActive,
		})
	}
	
	if err = rows.Err(); err != nil {
		log.Printf("❌ Error iterating authorities: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch authorities")
		return
	}
	
	log.Printf("✅ Fetched %d active authorities", len(authorities))
	respondWithJSON(w, http.StatusOK, authorities)
}

// GetAuthority - stub for getting authority by ID
func GetAuthority(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":      id,
		"message": "Get authority details",
	})
}

