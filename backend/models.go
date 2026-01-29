package main

import "time"

// ============================================
// COMPLAINT MODELS
// ============================================

// ComplaintPayload represents the encrypted complaint data from client
type ComplaintPayload struct {
	// Encrypted data
	EncryptedData string `json:"encryptedData" binding:"required"`
	IV            string `json:"iv" binding:"required"`

	// Encrypted keys for each authority
	EncryptedKeys []EncryptedKey `json:"encryptedKeys" binding:"required"`

	// Anonymized metadata (not encrypted)
	Metadata ComplaintMetadata `json:"metadata"`

	// System fields
	ReferenceCode string    `json:"referenceCode"`
	SubmittedAt   time.Time `json:"submittedAt"`
	Status        string    `json:"status"`
}

// EncryptedKey stores the symmetric key encrypted for each authority
type EncryptedKey struct {
	AuthorityID  string    `json:"authorityId" binding:"required"`
	EncryptedKey string    `json:"encryptedKey" binding:"required"`
	KeyAlgorithm string    `json:"keyAlgorithm"`
	Timestamp    time.Time `json:"timestamp"`
}

// ComplaintMetadata contains non-sensitive, anonymized information
type ComplaintMetadata struct {
	IncidentType string    `json:"incidentType"`
	Department   string    `json:"department"`
	IncidentDate string    `json:"incidentDate"`
	Timestamp    time.Time `json:"timestamp"`
	HasEvidence  bool      `json:"hasEvidence"`
}

// ============================================
// AUTHORITY MODELS
// ============================================

// Authority represents an entity that can decrypt complaints
type Authority struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"` // hr, icc, ngo, legal
	Name         string    `json:"name"`
	Organization string    `json:"organization"`
	PublicKey    string    `json:"publicKey"` // RSA/ECC public key
	KeyAlgorithm string    `json:"keyAlgorithm"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ============================================
// PATTERN DETECTION MODELS
// ============================================

// PatternMetadata represents detected patterns in complaints
type PatternMetadata struct {
	PatternHash     string    `json:"patternHash"`
	IncidentType    string    `json:"incidentType"`
	Department      string    `json:"department"`
	TimeWindowStart time.Time `json:"timeWindowStart"`
	TimeWindowEnd   time.Time `json:"timeWindowEnd"`
	OccurrenceCount int       `json:"occurrenceCount"`
	SeverityScore   float64   `json:"severityScore"`
	AlertTriggered  bool      `json:"alertTriggered"`
	FirstDetected   time.Time `json:"firstDetected"`
	LastUpdated     time.Time `json:"lastUpdated"`
}

// ============================================
// REQUEST/RESPONSE MODELS
// ============================================

// DecryptRequest represents authority decryption request
type DecryptRequest struct {
	ComplaintID string `json:"complaintId" binding:"required"`
	AuthorityID string `json:"authorityId" binding:"required"`
}

// AuthorityLoginRequest for authority authentication
type AuthorityLoginRequest struct {
	AuthorityID string `json:"authorityId" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

// AuthorityLoginResponse contains JWT token
type AuthorityLoginResponse struct {
	Token     string    `json:"token"`
	Authority Authority `json:"authority"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// ============================================
// AUDIT LOG MODEL
// ============================================

// AuditLog tracks authority access to complaints
type AuditLog struct {
	ID          string                 `json:"id"`
	AuthorityID string                 `json:"authorityId"`
	ComplaintID string                 `json:"complaintId"`
	Action      string                 `json:"action"` // decrypt_complaint, update_status, export_data
	Timestamp   time.Time              `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// ============================================
// STATISTICS MODELS
// ============================================

// DepartmentStats for analytics
type DepartmentStats struct {
	Department     string         `json:"department"`
	IncidentCounts map[string]int `json:"incidentCounts"`
	TotalIncidents int            `json:"totalIncidents"`
	TrendDirection string         `json:"trendDirection"` // increasing, decreasing, stable
}

// TemporalPattern for time-based analysis
type TemporalPattern struct {
	Week         string `json:"week"`
	IncidentType string `json:"incidentType"`
	Count        int    `json:"count"`
}
