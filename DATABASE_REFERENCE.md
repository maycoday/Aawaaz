# Aawaaz Database Schema Quick Reference

## Overview

Complete PostgreSQL database schema for the Aawaaz anonymous harassment reporting platform with zero-knowledge architecture.

## Installation

### 1. Create Database

```bash
# Using psql
createdb aawaaz

# Or via SQL
CREATE DATABASE aawaaz;
```

### 2. Run Schema

```bash
psql -U postgres -d aawaaz -f database_schema.sql
```

### 3. Verify Installation

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

Expected tables:
- authorities
- complaints
- encrypted_keys
- pattern_metadata
- authority_actions
- schema_version

## Tables

### 1. authorities

Stores authorized entities who can decrypt complaints.

**Key Columns:**
- `id` - VARCHAR(36) Primary Key
- `name` - Authority name
- `type` - HR, ICC, NGO, or LEGAL
- `public_key` - RSA-2048 public key (PEM format)
- `is_active` - Boolean status

**Seeded Data:**
- 4 authorities pre-populated with sample RSA keys
- auth-hr-001 (HR)
- auth-icc-001 (ICC)
- auth-ngo-001 (NGO)
- auth-legal-001 (LEGAL)

### 2. complaints

Stores encrypted complaint data.

**Key Columns:**
- `id` - VARCHAR(36) Primary Key
- `encrypted_payload` - BYTEA (AES-256-GCM encrypted)
- `anonymized_metadata` - JSONB (incidentType, departmentHash, etc.)
- `status` - pending, under_review, escalated, resolved, archived
- `created_at` - Timestamp

**Privacy Features:**
- No personal identifiers stored
- Encrypted payload never decrypted on server
- Only anonymized metadata for pattern detection

### 3. encrypted_keys

Stores AES symmetric key encrypted for each authority.

**Key Columns:**
- `id` - SERIAL Primary Key
- `complaint_id` - References complaints(id)
- `authority_id` - References authorities(id)
- `encrypted_key` - BYTEA (RSA-encrypted AES key)
- `access_count` - Audit counter

**Unique Constraint:**
- (complaint_id, authority_id) - One key per authority per complaint

### 4. pattern_metadata

Tracks anonymized patterns for repeat offender detection.

**Key Columns:**
- `id` - SERIAL Primary Key
- `department_hash` - SHA-256 hash of department
- `incident_type` - Type of incident
- `incident_count` - Number of similar incidents
- `last_incident_date` - Most recent incident

**Unique Constraint:**
- (department_hash, incident_type)

### 5. authority_actions

Audit log of authority actions.

**Key Columns:**
- `id` - SERIAL Primary Key
- `complaint_id` - References complaints(id)
- `authority_id` - References authorities(id)
- `action_type` - viewed, updated_status, escalated, resolved, archived, downloaded
- `action_timestamp` - When action occurred
- `notes` - Optional notes

## Indexes

### Performance Indexes

```sql
-- Complaints
idx_complaints_created_at (created_at DESC)
idx_complaints_status (status)
idx_complaints_metadata (GIN on JSONB)

-- Encrypted Keys
idx_encrypted_keys_complaint_id (complaint_id)
idx_encrypted_keys_authority_id (authority_id)

-- Pattern Metadata
idx_pattern_metadata_department (department_hash)
idx_pattern_metadata_incident_type (incident_type)
idx_pattern_metadata_count (incident_count DESC)

-- Authority Actions
idx_authority_actions_complaint (complaint_id)
idx_authority_actions_authority (authority_id)
idx_authority_actions_timestamp (action_timestamp DESC)
```

## Triggers

### 1. update_pattern_metadata()

**Purpose:** Automatically updates pattern detection metadata when new complaint is inserted.

**Actions:**
- Extracts departmentHash and incidentType from metadata
- Inserts or updates pattern_metadata table
- Increments incident_count on conflict
- Updates last_incident_date

**Usage:** Fires automatically on INSERT into complaints table.

### 2. update_updated_at_column()

**Purpose:** Automatically updates the updated_at timestamp.

**Tables:**
- complaints
- authorities
- pattern_metadata

**Usage:** Fires automatically on UPDATE.

## Views

### 1. complaint_stats_by_type

Statistics grouped by incident type.

```sql
SELECT * FROM complaint_stats_by_type;
```

**Columns:**
- incident_type
- total_complaints
- pending_count
- under_review_count
- resolved_count
- first_complaint_date
- last_complaint_date

### 2. pattern_detection_summary

Pattern detection with risk levels.

```sql
SELECT * FROM pattern_detection_summary 
WHERE risk_level = 'HIGH RISK';
```

**Columns:**
- department_hash
- incident_type
- incident_count
- last_incident_date
- risk_level (HIGH/MEDIUM/LOW)
- days_since_last_incident

### 3. authority_activity_summary

Authority activity metrics.

```sql
SELECT * FROM authority_activity_summary;
```

**Columns:**
- id, name, type
- complaints_assigned
- total_actions
- views_count
- resolved_count
- last_activity

## Helper Functions

### 1. get_department_complaint_count(dept_hash)

Get total complaint count for a department.

```sql
SELECT get_department_complaint_count('5e884898da2804...');
```

### 2. check_pattern_threshold(dept_hash, threshold)

Check if pattern threshold is exceeded.

```sql
SELECT check_pattern_threshold('5e884898da2804...', 3);
-- Returns true if count >= 3
```

## Common Queries

### Insert a Complaint

```sql
INSERT INTO complaints (
    id, 
    encrypted_payload, 
    anonymized_metadata, 
    status
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '\xDEADBEEF'::bytea,
    '{"incidentType": "verbal", "departmentHash": "abc123", "timestamp": "2024-01-15T10:30:00Z"}'::jsonb,
    'pending'
);
```

### Insert Encrypted Keys

```sql
INSERT INTO encrypted_keys (
    complaint_id,
    authority_id,
    encrypted_key
) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'auth-hr-001', '\xABCD1234'::bytea),
    ('550e8400-e29b-41d4-a716-446655440000', 'auth-icc-001', '\xEF567890'::bytea);
```

### Get Active Authorities

```sql
SELECT id, name, type, email 
FROM authorities 
WHERE is_active = true 
ORDER BY type;
```

### Get Pending Complaints

```sql
SELECT 
    id,
    anonymized_metadata->>'incidentType' as incident_type,
    status,
    created_at
FROM complaints
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Get High-Risk Patterns

```sql
SELECT * 
FROM pattern_detection_summary 
WHERE risk_level = 'HIGH RISK'
ORDER BY incident_count DESC;
```

### Get Complaint with Authorities

```sql
SELECT 
    c.id,
    c.status,
    c.created_at,
    json_agg(json_build_object(
        'authority_id', a.id,
        'authority_name', a.name,
        'authority_type', a.type
    )) as authorities
FROM complaints c
JOIN encrypted_keys ek ON c.id = ek.complaint_id
JOIN authorities a ON ek.authority_id = a.id
WHERE c.id = 'complaint-id-here'
GROUP BY c.id, c.status, c.created_at;
```

### Log Authority Action

```sql
INSERT INTO authority_actions (
    complaint_id,
    authority_id,
    action_type,
    notes
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'auth-icc-001',
    'viewed',
    'Reviewed complaint details'
);
```

## Data Types

### Metadata JSONB Structure

```json
{
  "incidentType": "verbal|sexual|physical|discrimination|bullying|retaliation|intimidation|other",
  "departmentHash": "sha256-hash-string",
  "timestamp": "2024-01-15T10:30:00Z",
  "incidentDate": "2024-01-10",
  "hasEvidence": false
}
```

### Status Values

- `pending` - Initial status
- `under_review` - Being investigated
- `escalated` - Escalated to higher authority
- `resolved` - Complaint resolved
- `archived` - Archived for records

### Action Types

- `viewed` - Authority viewed complaint
- `updated_status` - Status changed
- `escalated` - Escalated to another authority
- `resolved` - Marked as resolved
- `archived` - Archived
- `downloaded` - Downloaded complaint data

### Authority Types

- `HR` - Human Resources
- `ICC` - Internal Complaints Committee
- `NGO` - External NGO Partner
- `LEGAL` - Legal/Compliance Office

## Security Features

### Zero-Knowledge Architecture

1. **Encrypted Payload Storage**
   - Binary BYTEA format
   - Never decrypted on server
   - AES-256-GCM encryption

2. **Per-Authority Key Encryption**
   - Each authority gets separate encrypted key
   - RSA-OAEP with authority's public key
   - Can only decrypt their assigned complaints

3. **Anonymized Metadata**
   - Department stored as SHA-256 hash
   - No personal identifiers
   - Pattern detection without PII

4. **Audit Trail**
   - All authority actions logged
   - Accountability without surveillance
   - Timestamp and action type recorded

## Maintenance

### Backup Database

```bash
pg_dump -U postgres aawaaz > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U postgres aawaaz < backup_20240115.sql
```

### Check Database Size

```sql
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database;
```

### Vacuum and Analyze

```sql
VACUUM ANALYZE complaints;
VACUUM ANALYZE encrypted_keys;
VACUUM ANALYZE pattern_metadata;
```

## Troubleshooting

### Permission Denied

```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE aawaaz TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Trigger Not Firing

```sql
-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Reset Pattern Metadata

```sql
-- Clear and rebuild pattern metadata
TRUNCATE pattern_metadata CASCADE;
-- Will rebuild on next complaint insert
```

## Version

**Schema Version:** 2.0.0
**Created:** 2026-02-14
**Database:** PostgreSQL 14+
**Compatible With:** Aawaaz Backend v2.0+

## Next Steps

1. Configure `.env` with database credentials
2. Start backend server: `cd backend && go run .`
3. Start frontend: `cd frontend && npm run dev`
4. Test endpoint: `POST /api/v1/complaints/submit`

## Support

For issues or questions, refer to the main project documentation or backend README.
