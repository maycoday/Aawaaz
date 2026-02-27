-- ============================================
-- AAWAAZ DATABASE SCHEMA
-- ============================================
-- PostgreSQL Database Schema for Anonymous Harassment Reporting Platform
-- Zero-Knowledge Architecture | End-to-End Encryption | Privacy-First Design
--
-- Created: 2026-02-14
-- Version: 2.0
-- Database: PostgreSQL 14+
-- ============================================

-- Drop existing tables if recreating (dev only - comment out for production)
-- DROP TABLE IF EXISTS authority_actions CASCADE;
-- DROP TABLE IF EXISTS pattern_metadata CASCADE;
-- DROP TABLE IF EXISTS encrypted_keys CASCADE;
-- DROP TABLE IF EXISTS complaints CASCADE;
-- DROP TABLE IF EXISTS authorities CASCADE;

-- ============================================
-- TABLE 1: AUTHORITIES
-- ============================================
-- Stores authorized entities who can decrypt and view complaints
-- Each authority has a unique RSA public key for encryption

CREATE TABLE authorities (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('HR', 'ICC', 'NGO', 'LEGAL')),
    description TEXT,
    public_key TEXT NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering by authority type
CREATE INDEX idx_authorities_type ON authorities(type);
CREATE INDEX idx_authorities_active ON authorities(is_active);

COMMENT ON TABLE authorities IS 'Authorized entities that can decrypt and view complaints';
COMMENT ON COLUMN authorities.public_key IS 'RSA-2048 public key in PEM format for encrypting symmetric keys';
COMMENT ON COLUMN authorities.type IS 'Authority type: HR (Human Resources), ICC (Internal Complaints Committee), NGO (External NGO), LEGAL (Legal Authority)';

-- ============================================
-- TABLE 2: COMPLAINTS
-- ============================================
-- Stores encrypted complaint data
-- Encrypted payload is NEVER decrypted on server - zero-knowledge architecture

CREATE TABLE complaints (
    id VARCHAR(36) PRIMARY KEY,
    encrypted_payload BYTEA NOT NULL,
    anonymized_metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'escalated', 'resolved', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_metadata ON complaints USING GIN (anonymized_metadata);

COMMENT ON TABLE complaints IS 'Encrypted complaints - payload is never decrypted on server';
COMMENT ON COLUMN complaints.encrypted_payload IS 'AES-256-GCM encrypted complaint data (binary format)';
COMMENT ON COLUMN complaints.anonymized_metadata IS 'Non-sensitive metadata for pattern detection: {incidentType, departmentHash, timestamp, hasEvidence}';
COMMENT ON COLUMN complaints.status IS 'Complaint processing status';

-- ============================================
-- TABLE 3: ENCRYPTED_KEYS
-- ============================================
-- Stores the AES symmetric key encrypted separately for each authority
-- Each authority can only decrypt complaints they have access to

CREATE TABLE encrypted_keys (
    id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    authority_id VARCHAR(36) NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
    encrypted_key BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    CONSTRAINT unique_complaint_authority UNIQUE(complaint_id, authority_id)
);

-- Indexes for lookups
CREATE INDEX idx_encrypted_keys_complaint_id ON encrypted_keys(complaint_id);
CREATE INDEX idx_encrypted_keys_authority_id ON encrypted_keys(authority_id);

COMMENT ON TABLE encrypted_keys IS 'Symmetric encryption keys encrypted per authority using their RSA public key';
COMMENT ON COLUMN encrypted_keys.encrypted_key IS 'AES-256 symmetric key encrypted with authority RSA public key';
COMMENT ON COLUMN encrypted_keys.access_count IS 'Number of times authority has accessed this complaint (for audit)';

-- ============================================
-- TABLE 4: PATTERN_METADATA
-- ============================================
-- Tracks anonymized patterns for repeat offender detection
-- No personal identifiers - only hashed departments and incident types

CREATE TABLE pattern_metadata (
    id SERIAL PRIMARY KEY,
    department_hash VARCHAR(64),
    incident_type VARCHAR(100),
    incident_count INTEGER DEFAULT 1,
    last_incident_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_department_incident UNIQUE(department_hash, incident_type)
);

-- Index for pattern queries
CREATE INDEX idx_pattern_metadata_department ON pattern_metadata(department_hash);
CREATE INDEX idx_pattern_metadata_incident_type ON pattern_metadata(incident_type);
CREATE INDEX idx_pattern_metadata_count ON pattern_metadata(incident_count DESC);

COMMENT ON TABLE pattern_metadata IS 'Anonymized pattern detection for identifying repeat incidents';
COMMENT ON COLUMN pattern_metadata.department_hash IS 'SHA-256 hash of department name (for anonymity)';
COMMENT ON COLUMN pattern_metadata.incident_count IS 'Number of similar incidents in this department';

-- ============================================
-- TABLE 5: AUTHORITY_ACTIONS
-- ============================================
-- Audit log of authority actions on complaints
-- For accountability and transparency (not surveillance)

CREATE TABLE authority_actions (
    id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(36) REFERENCES complaints(id) ON DELETE CASCADE,
    authority_id VARCHAR(36) REFERENCES authorities(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('viewed', 'updated_status', 'escalated', 'resolved', 'archived', 'downloaded')),
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    metadata JSONB
);

-- Indexes for audit queries
CREATE INDEX idx_authority_actions_complaint ON authority_actions(complaint_id);
CREATE INDEX idx_authority_actions_authority ON authority_actions(authority_id);
CREATE INDEX idx_authority_actions_timestamp ON authority_actions(action_timestamp DESC);
CREATE INDEX idx_authority_actions_type ON authority_actions(action_type);

COMMENT ON TABLE authority_actions IS 'Audit trail of authority actions on complaints';
COMMENT ON COLUMN authority_actions.action_type IS 'Type of action performed: viewed, updated_status, escalated, resolved, archived, downloaded';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger 1: Auto-update pattern_metadata when complaint is inserted
CREATE OR REPLACE FUNCTION update_pattern_metadata()
RETURNS TRIGGER AS $$
DECLARE
    dept_hash VARCHAR(64);
    inc_type VARCHAR(100);
BEGIN
    -- Extract department hash and incident type from metadata
    dept_hash := NEW.anonymized_metadata->>'departmentHash';
    inc_type := NEW.anonymized_metadata->>'incidentType';
    
    -- Only update if both values exist
    IF dept_hash IS NOT NULL AND inc_type IS NOT NULL THEN
        -- Insert or update pattern metadata
        INSERT INTO pattern_metadata (
            department_hash,
            incident_type,
            incident_count,
            last_incident_date,
            created_at,
            updated_at
        ) VALUES (
            dept_hash,
            inc_type,
            1,
            NEW.created_at,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (department_hash, incident_type) 
        DO UPDATE SET
            incident_count = pattern_metadata.incident_count + 1,
            last_incident_date = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to complaints table
CREATE TRIGGER trigger_update_pattern_metadata
    AFTER INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_pattern_metadata();

COMMENT ON FUNCTION update_pattern_metadata IS 'Automatically updates pattern detection metadata when new complaint is submitted';

-- Trigger 2: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to tables that need auto-update
CREATE TRIGGER trigger_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_authorities_updated_at
    BEFORE UPDATE ON authorities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pattern_metadata_updated_at
    BEFORE UPDATE ON pattern_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: AUTHORITIES
-- ============================================
-- Insert 4 default authorities with sample RSA public keys

INSERT INTO authorities (id, name, type, description, public_key, email, phone, is_active) VALUES
(
    'auth-hr-001',
    'Company HR Department',
    'HR',
    'Internal Human Resources team handling workplace issues',
    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyV3fJQfzN7nKp5V9p3Wh
X8HjE5KLMxPxQ7RhJJh5mF0JjKZzGvN3YUH0PqKKX9jH4fzN7nKp5V9p3WhX8HjE
5KLMxPxQ7RhJJh5mF0JjKZzGvN3YUH0PqKKX9jH4fzN7nKp5V9p3WhX8HjE5KLMx
PxQ7RhJJh5mF0JjKZzGvN3YUH0PqKKX9jH4fzN7nKp5V9p3WhX8HjE5KLMxPxQ7R
hJJh5mF0JjKZzGvN3YUH0PqKKX9jH4fzN7nKp5V9p3WhX8HjE5KLMxPxQ7RhJJh5
mF0JjKZzGvN3YUH0PqKKX9jH4fzN7nKp5V9p3WhX8HjE5KLMxPxQ7RhJJh5mF0Jj
KQIDAQAB
-----END PUBLIC KEY-----',
    'hr@company.com',
    '+1-555-0101',
    true
),
(
    'auth-icc-001',
    'Internal Complaints Committee',
    'ICC',
    'Statutory committee for handling harassment complaints as per law',
    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1hYzQ8kLpN9dVfM8xPzS
2bJ5nH9kLQmR4vT6yU7xZ1qW3eD4sF5tG6hR8kLpN9dVfM8xPzS2bJ5nH9kLQmR4
vT6yU7xZ1qW3eD4sF5tG6hR8kLpN9dVfM8xPzS2bJ5nH9kLQmR4vT6yU7xZ1qW3e
D4sF5tG6hR8kLpN9dVfM8xPzS2bJ5nH9kLQmR4vT6yU7xZ1qW3eD4sF5tG6hR8kL
pN9dVfM8xPzS2bJ5nH9kLQmR4vT6yU7xZ1qW3eD4sF5tG6hR8kLpN9dVfM8xPzS2
bJ5nH9kLQmR4vT6yU7xZ1qW3eD4sF5tG6hR8kLpN9dVfM8xPzS2bJ5nH9kLQmR4v
T6yU7xZ1qW3eD4sF5tG6hR8
-----END PUBLIC KEY-----',
    'icc@company.com',
    '+1-555-0102',
    true
),
(
    'auth-ngo-001',
    'Women Safety NGO Partner',
    'NGO',
    'External support organization providing counseling and legal assistance',
    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8kF7tR5nP3mL9qW1xY2z
V4bN6hK8jT3pQ9sU7vC5wD2eF6gH9iR8kF7tR5nP3mL9qW1xY2zV4bN6hK8jT3pQ
9sU7vC5wD2eF6gH9iR8kF7tR5nP3mL9qW1xY2zV4bN6hK8jT3pQ9sU7vC5wD2eF6
gH9iR8kF7tR5nP3mL9qW1xY2zV4bN6hK8jT3pQ9sU7vC5wD2eF6gH9iR8kF7tR5n
P3mL9qW1xY2zV4bN6hK8jT3pQ9sU7vC5wD2eF6gH9iR8kF7tR5nP3mL9qW1xY2zV
4bN6hK8jT3pQ9sU7vC5wD2eF6gH9iR8kF7tR5nP3mL9qW1xY2zV4bN6hK8jT3pQ9
sU7vC5wD2eF6gH9i
-----END PUBLIC KEY-----',
    'contact@safeworkplace-ngo.org',
    '+1-555-0103',
    true
),
(
    'auth-legal-001',
    'Legal Compliance Office',
    'LEGAL',
    'Legal department for severe violations requiring legal action',
    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5pR2tN7xL4qM3vW9nH6k
J8fT5bY1zP2qR7wS3uE9xF4gN5pR2tN7xL4qM3vW9nH6kJ8fT5bY1zP2qR7wS3uE
9xF4gN5pR2tN7xL4qM3vW9nH6kJ8fT5bY1zP2qR7wS3uE9xF4gN5pR2tN7xL4qM3
vW9nH6kJ8fT5bY1zP2qR7wS3uE9xF4gN5pR2tN7xL4qM3vW9nH6kJ8fT5bY1zP2q
R7wS3uE9xF4gN5pR2tN7xL4qM3vW9nH6kJ8fT5bY1zP2qR7wS3uE9xF4gN5pR2tN
7xL4qM3vW9nH6kJ8fT5bY1zP2qR7wS3uE9xF4gN5pR2tN7xL4qM3vW9nH6kJ8fT5
bY1zP2qR7wS3uE9xF4gN
-----END PUBLIC KEY-----',
    'legal@company.com',
    '+1-555-0104',
    true
);

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View 1: Complaint statistics by incident type
CREATE OR REPLACE VIEW complaint_stats_by_type AS
SELECT 
    anonymized_metadata->>'incidentType' AS incident_type,
    COUNT(*) AS total_complaints,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN status = 'under_review' THEN 1 END) AS under_review_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_count,
    MIN(created_at) AS first_complaint_date,
    MAX(created_at) AS last_complaint_date
FROM complaints
WHERE anonymized_metadata->>'incidentType' IS NOT NULL
GROUP BY anonymized_metadata->>'incidentType'
ORDER BY total_complaints DESC;

-- View 2: Pattern detection summary
CREATE OR REPLACE VIEW pattern_detection_summary AS
SELECT 
    department_hash,
    incident_type,
    incident_count,
    last_incident_date,
    CASE 
        WHEN incident_count >= 5 THEN 'HIGH RISK'
        WHEN incident_count >= 3 THEN 'MEDIUM RISK'
        ELSE 'LOW RISK'
    END AS risk_level,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - last_incident_date)) AS days_since_last_incident
FROM pattern_metadata
ORDER BY incident_count DESC, last_incident_date DESC;

-- View 3: Authority activity summary
CREATE OR REPLACE VIEW authority_activity_summary AS
SELECT 
    a.id,
    a.name,
    a.type,
    COUNT(DISTINCT ek.complaint_id) AS complaints_assigned,
    COUNT(aa.id) AS total_actions,
    COUNT(CASE WHEN aa.action_type = 'viewed' THEN 1 END) AS views_count,
    COUNT(CASE WHEN aa.action_type = 'resolved' THEN 1 END) AS resolved_count,
    MAX(aa.action_timestamp) AS last_activity
FROM authorities a
LEFT JOIN encrypted_keys ek ON a.id = ek.authority_id
LEFT JOIN authority_actions aa ON a.id = aa.authority_id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.type
ORDER BY a.type, a.name;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function 1: Get complaint count for a department (by hash)
CREATE OR REPLACE FUNCTION get_department_complaint_count(dept_hash VARCHAR(64))
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(incident_count), 0)
        FROM pattern_metadata
        WHERE department_hash = dept_hash
    );
END;
$$ LANGUAGE plpgsql;

-- Function 2: Check if pattern threshold exceeded (for alerts)
CREATE OR REPLACE FUNCTION check_pattern_threshold(dept_hash VARCHAR(64), threshold INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM pattern_metadata
        WHERE department_hash = dept_hash
        AND incident_count >= threshold
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================

-- Query 1: Get all active authorities
-- SELECT id, name, type, email FROM authorities WHERE is_active = true;

-- Query 2: Get complaints by status
-- SELECT id, status, created_at, anonymized_metadata->>'incidentType' as incident_type 
-- FROM complaints 
-- WHERE status = 'pending' 
-- ORDER BY created_at DESC;

-- Query 3: Get pattern detection summary
-- SELECT * FROM pattern_detection_summary WHERE risk_level = 'HIGH RISK';

-- Query 4: Get authority actions for a complaint
-- SELECT aa.*, a.name as authority_name 
-- FROM authority_actions aa 
-- JOIN authorities a ON aa.authority_id = a.id 
-- WHERE aa.complaint_id = 'complaint-id-here' 
-- ORDER BY aa.action_timestamp DESC;

-- ============================================
-- GRANTS (for production)
-- ============================================

-- Grant read-only access to reporting user
-- CREATE USER aawaaz_reporting WITH PASSWORD 'secure_password';
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO aawaaz_reporting;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO aawaaz_reporting;

-- Grant full access to application user
-- CREATE USER aawaaz_app WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aawaaz_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aawaaz_app;

-- ============================================
-- SCHEMA VERSION INFO
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES
('2.0.0', 'Complete database schema for Aawaaz platform with encryption support, pattern detection, and audit trails');

-- ============================================
-- END OF SCHEMA
-- ============================================

-- Verification: Check that all tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name IN ('authorities', 'complaints', 'encrypted_keys', 'pattern_metadata', 'authority_actions')
ORDER BY table_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Aawaaz Database Schema v2.0 Installed Successfully';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables Created: 5';
    RAISE NOTICE 'Authorities Seeded: 4';
    RAISE NOTICE 'Triggers Active: 4';
    RAISE NOTICE 'Views Created: 3';
    RAISE NOTICE 'Helper Functions: 2';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update .env with database credentials';
    RAISE NOTICE '2. Start backend: cd backend && go run .';
    RAISE NOTICE '3. Start frontend: cd frontend && npm run dev';
    RAISE NOTICE '==============================================';
END $$;

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
