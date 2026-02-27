-- Aawaaj Database Schema for PostgreSQL/Supabase
-- Privacy-First, Zero-Trust Architecture
-- All sensitive data stored encrypted, no plaintext

-- ============================================
-- 1. AUTHORITIES TABLE
-- ============================================
-- Stores authorized entities who can decrypt complaints
CREATE TABLE authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authority_type VARCHAR(50) NOT NULL CHECK (authority_type IN ('hr', 'icc', 'ngo', 'legal')),
    authority_name VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255),
    public_key TEXT NOT NULL, -- RSA/ECC public key for encrypting symmetric keys
    key_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP-256', -- Encryption algorithm
    key_fingerprint VARCHAR(128) UNIQUE, -- Hash of public key for verification
    is_active BOOLEAN DEFAULT true,
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_key_rotation TIMESTAMPTZ,
    
    -- Metadata for accountability
    verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    
    CONSTRAINT unique_authority UNIQUE (authority_type, organization_name)
);

-- Indexes for performance
CREATE INDEX idx_authorities_type ON authorities(authority_type);
CREATE INDEX idx_authorities_active ON authorities(is_active);

-- ============================================
-- 2. ENCRYPTED COMPLAINTS TABLE
-- ============================================
-- Stores encrypted complaint data
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(20) UNIQUE NOT NULL, -- User-facing reference (e.g., ABCD-1234-EFGH)
    
    -- ENCRYPTED DATA (AES-256-GCM)
    encrypted_data TEXT NOT NULL, -- Base64 encoded encrypted complaint content
    iv TEXT NOT NULL, -- Initialization Vector for AES-GCM
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    
    -- ANONYMIZED METADATA (for pattern detection)
    incident_type VARCHAR(50), -- 'verbal', 'sexual', 'physical', 'discrimination', etc.
    department VARCHAR(100), -- Anonymized department code
    incident_date DATE, -- Date of incident (not submission date)
    has_evidence BOOLEAN DEFAULT false,
    
    -- TIMESTAMPS
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- STATUS TRACKING
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'archived')),
    resolution_date TIMESTAMPTZ,
    
    -- NO PERSONAL IDENTIFIERS
    -- No IP addresses, no user IDs, no tracking cookies
    
    CONSTRAINT valid_reference_code CHECK (reference_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

-- Indexes for queries and pattern detection
CREATE INDEX idx_complaints_incident_type ON complaints(incident_type);
CREATE INDEX idx_complaints_department ON complaints(department);
CREATE INDEX idx_complaints_submitted_at ON complaints(submitted_at);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_incident_date ON complaints(incident_date);

-- ============================================
-- 3. ENCRYPTED KEYS TABLE
-- ============================================
-- Stores symmetric keys encrypted for each authority
CREATE TABLE encrypted_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    authority_id UUID NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
    
    -- ENCRYPTED SYMMETRIC KEY
    encrypted_key TEXT NOT NULL, -- Symmetric key encrypted with authority's public key
    key_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP-256',
    
    -- ACCESS TRACKING (for accountability, not surveillance)
    accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_complaint_authority UNIQUE (complaint_id, authority_id)
);

-- Indexes
CREATE INDEX idx_encrypted_keys_complaint ON encrypted_keys(complaint_id);
CREATE INDEX idx_encrypted_keys_authority ON encrypted_keys(authority_id);

-- ============================================
-- 4. ENCRYPTED EVIDENCE TABLE
-- ============================================
-- Stores encrypted file attachments (images, documents, etc.)
CREATE TABLE encrypted_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    
    -- ENCRYPTED FILE DATA
    encrypted_file_data TEXT NOT NULL, -- Base64 encoded encrypted file
    iv TEXT NOT NULL,
    file_mime_type VARCHAR(100), -- e.g., 'image/jpeg', 'application/pdf'
    original_filename_hash VARCHAR(128), -- Hash of original filename (not plaintext)
    file_size_bytes INTEGER,
    
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_encrypted_evidence_complaint ON encrypted_evidence(complaint_id);

-- ============================================
-- 5. PATTERN DETECTION METADATA TABLE
-- ============================================
-- Stores anonymized patterns for repeat offender detection
CREATE TABLE pattern_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ANONYMIZED PATTERN HASH
    -- Created from: department + time_window + incident_type
    -- WITHOUT revealing individual complaint IDs
    pattern_hash VARCHAR(128) UNIQUE NOT NULL,
    
    incident_type VARCHAR(50),
    department VARCHAR(100),
    time_window_start DATE,
    time_window_end DATE,
    
    occurrence_count INTEGER DEFAULT 1,
    
    -- SEVERITY SCORING (ML-based in production)
    severity_score DECIMAL(3, 2), -- 0.00 to 1.00
    
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- ALERT STATUS
    alert_triggered BOOLEAN DEFAULT false,
    alert_sent_to UUID[], -- Array of authority IDs notified
    
    CONSTRAINT valid_severity CHECK (severity_score >= 0 AND severity_score <= 1)
);

-- Indexes
CREATE INDEX idx_pattern_metadata_hash ON pattern_metadata(pattern_hash);
CREATE INDEX idx_pattern_metadata_department ON pattern_metadata(department);
CREATE INDEX idx_pattern_metadata_incident_type ON pattern_metadata(incident_type);

-- ============================================
-- 6. AUDIT LOG TABLE (for accountability)
-- ============================================
-- Tracks authority access to complaints (NOT reporter activity)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    authority_id UUID REFERENCES authorities(id),
    complaint_id UUID REFERENCES complaints(id),
    
    action VARCHAR(100) NOT NULL, -- 'decrypt_complaint', 'update_status', 'export_data'
    
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- NO IP ADDRESSES OR IDENTIFYING INFO
    -- Only what authority did what action on which complaint
    
    metadata JSONB -- Additional context (e.g., {"status_changed_to": "under_review"})
);

-- Indexes
CREATE INDEX idx_audit_log_authority ON audit_log(authority_id);
CREATE INDEX idx_audit_log_complaint ON audit_log(complaint_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- ============================================
-- 7. VIEWS FOR ANALYTICS (Privacy-Preserving)
-- ============================================

-- View: Department incident counts (no personal data)
CREATE VIEW department_incident_stats AS
SELECT 
    department,
    incident_type,
    COUNT(*) as incident_count,
    DATE_TRUNC('month', submitted_at) as month
FROM complaints
WHERE department IS NOT NULL
GROUP BY department, incident_type, DATE_TRUNC('month', submitted_at);

-- View: Temporal patterns (time-based analysis)
CREATE VIEW temporal_patterns AS
SELECT 
    DATE_TRUNC('week', submitted_at) as week,
    incident_type,
    COUNT(*) as count
FROM complaints
GROUP BY DATE_TRUNC('week', submitted_at), incident_type
ORDER BY week DESC;

-- View: Authority workload (for capacity planning)
CREATE VIEW authority_workload AS
SELECT 
    a.authority_type,
    a.authority_name,
    COUNT(DISTINCT ek.complaint_id) as assigned_complaints,
    COUNT(CASE WHEN ek.accessed_at IS NOT NULL THEN 1 END) as accessed_complaints
FROM authorities a
LEFT JOIN encrypted_keys ek ON a.id = ek.authority_id
WHERE a.is_active = true
GROUP BY a.id, a.authority_type, a.authority_name;

-- ============================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update timestamp on authorities table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update authorities timestamp
CREATE TRIGGER trigger_authorities_updated_at
BEFORE UPDATE ON authorities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function: Generate reference code
CREATE OR REPLACE FUNCTION generate_reference_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        IF i % 4 = 0 AND i < 12 THEN
            result := result || '-';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect patterns and update metadata
CREATE OR REPLACE FUNCTION detect_pattern(
    p_department VARCHAR(100),
    p_incident_type VARCHAR(50),
    p_incident_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_pattern_hash VARCHAR(128);
    v_window_start DATE;
    v_window_end DATE;
    v_count INTEGER;
BEGIN
    -- Define 2-week window
    v_window_start := p_incident_date - INTERVAL '2 weeks';
    v_window_end := p_incident_date;
    
    -- Generate pattern hash
    v_pattern_hash := md5(p_department || p_incident_type || v_window_start::text);
    
    -- Count similar incidents in window
    SELECT COUNT(*) INTO v_count
    FROM complaints
    WHERE department = p_department
      AND incident_type = p_incident_type
      AND incident_date BETWEEN v_window_start AND v_window_end;
    
    -- Insert or update pattern metadata
    INSERT INTO pattern_metadata (
        pattern_hash,
        incident_type,
        department,
        time_window_start,
        time_window_end,
        occurrence_count,
        severity_score
    )
    VALUES (
        v_pattern_hash,
        p_incident_type,
        p_department,
        v_window_start,
        v_window_end,
        v_count,
        LEAST(v_count::DECIMAL / 10, 1.0) -- Simple severity score
    )
    ON CONFLICT (pattern_hash) DO UPDATE
    SET occurrence_count = v_count,
        severity_score = LEAST(v_count::DECIMAL / 10, 1.0),
        last_updated = NOW(),
        alert_triggered = CASE WHEN v_count >= 3 THEN true ELSE alert_triggered END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ROW LEVEL SECURITY (Optional for Supabase)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_evidence ENABLE ROW LEVEL SECURITY;

-- Policy: Only authorities can read their assigned complaints
CREATE POLICY authority_access_policy ON encrypted_keys
    FOR SELECT
    USING (authority_id = current_setting('app.current_authority_id')::UUID);

-- ============================================
-- 10. SEED DATA (for demo)
-- ============================================

-- Insert demo authorities
INSERT INTO authorities (authority_type, authority_name, organization_name, public_key, verified) VALUES
('icc', 'Dr. Sarah Johnson', 'Internal Complaints Committee', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', true),
('ngo', 'SafeWorkplace Foundation', 'SafeWorkplace NGO', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', true),
('hr', 'Human Resources Dept', 'TechCorp HR', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', true),
('legal', 'National Commission for Women', 'NCW', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', false);

-- ============================================
-- NOTES FOR PRODUCTION:
-- ============================================
-- 1. Use actual RSA-2048 or ECC keys for authorities
-- 2. Implement key rotation every 90 days
-- 3. Add rate limiting for complaint submissions
-- 4. Implement CAPTCHA or proof-of-work to prevent spam
-- 5. Set up automated backups with encryption at rest
-- 6. Configure Supabase security policies
-- 7. Implement ML-based pattern detection
-- 8. Add notification system for authority alerts
-- 9. Configure connection pooling for high traffic
-- 10. Set up monitoring and alerting for suspicious access patterns

-- ============================================
-- PRIVACY GUARANTEES:
-- ============================================
-- ✓ No personal identifiers stored
-- ✓ No IP addresses logged
-- ✓ No user accounts required
-- ✓ All sensitive data encrypted client-side
-- ✓ Server never sees plaintext complaint data
-- ✓ Encryption keys never stored in plaintext
-- ✓ Pattern detection uses only anonymized metadata
-- ✓ Audit logs track authority actions only (not reporters)
