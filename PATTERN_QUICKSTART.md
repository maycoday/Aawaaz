# Pattern Detection Service - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up and test the Pattern Detection Service.

## Prerequisites

- PostgreSQL 14+ installed and running
- Go 1.21+ installed
- Aawaaz database schema already set up

## Step 1: Setup Database

### 1.1 Create Database (if not exists)
```bash
psql -U postgres
CREATE DATABASE aawaaj;
\c aawaaj
```

### 1.2 Run Schema
```bash
psql -U postgres -d aawaaj -f database_schema.sql
```

This creates:
- `complaints` table
- `pattern_metadata` table
- Auto-update trigger for pattern tracking

### 1.3 Verify Tables
```sql
\dt
-- Should show: complaints, authorities, encrypted_keys, pattern_metadata, authority_actions
```

## Step 2: Configure Environment

### 2.1 Create `.env` file (optional)
```bash
cd backend
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aawaaj
DB_SSL_MODE=disable
EOF
```

### 2.2 Or Set Environment Variables
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=aawaaj
```

## Step 3: Install Dependencies

```bash
cd backend
go mod tidy
```

This installs:
- `github.com/lib/pq` - PostgreSQL driver
- `github.com/gorilla/mux` - HTTP router
- `github.com/rs/cors` - CORS middleware

## Step 4: Start Backend Server

```bash
cd backend
go run .
```

**Expected Output:**
```
🔌 Connecting to database...
✅ Database connection established
✅ Database schema verified
🔍 Initializing pattern detection service...
🕐 Starting pattern analysis scheduler (daily at midnight)...
🚀 Running initial pattern analysis...
🔍 Starting ethical pattern analysis...
✅ Pattern analysis complete: 0 departments analyzed
📊 Generating pattern analysis report...
🚨 Detecting incident spikes...
✅ Spike detection complete: 0 alerts generated
✅ Report generated: 0 departments, 0 alerts
============================================================
📊 PATTERN ANALYSIS REPORT
Generated: 2026-02-14T12:00:00Z
Time Range: Last 90 days
Total Departments Analyzed: 0
🔴 High Risk: 0
🟡 Medium Risk: 0
🟢 Low Risk: 0
🚨 Alerts Generated: 0
⏱️  Analysis completed in 15ms
============================================================
⏰ Next scheduled analysis at: 2026-02-15T00:00:00Z
🚀 Aawaaj API Server starting on port 8080
🔒 Zero-trust architecture enabled
🛡️ CORS enabled for React frontend
```

## Step 5: Insert Test Data

### 5.1 Create HIGH RISK Department (5+ incidents in 30 days)
```sql
-- Connect to database
psql -U postgres -d aawaaj

-- Insert 6 complaints in last 30 days for same department
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-hr-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW() - INTERVAL '5 days'),
  ('test-hr-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW() - INTERVAL '8 days'),
  ('test-hr-003', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW() - INTERVAL '12 days'),
  ('test-hr-004', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "discrimination"}'::jsonb, 
   NOW() - INTERVAL '15 days'),
  ('test-hr-005', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW() - INTERVAL '20 days'),
  ('test-hr-006', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "bullying"}'::jsonb, 
   NOW() - INTERVAL '25 days');
```

### 5.2 Create MEDIUM RISK Department (3-4 incidents in 30 days)
```sql
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-mr-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_medium_risk_001", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW() - INTERVAL '7 days'),
  ('test-mr-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_medium_risk_001", "incidentType": "discrimination"}'::jsonb, 
   NOW() - INTERVAL '14 days'),
  ('test-mr-003', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_medium_risk_001", "incidentType": "bullying"}'::jsonb, 
   NOW() - INTERVAL '21 days');
```

### 5.3 Create SPIKE Department (recent surge)
```sql
-- Old incidents (90 days ago)
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-spike-old-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_spike_001", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW() - INTERVAL '60 days'),
  ('test-spike-old-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_spike_001", "incidentType": "discrimination"}'::jsonb, 
   NOW() - INTERVAL '70 days');

-- Recent spike (last 7 days)
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-spike-new-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_spike_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW() - INTERVAL '2 days'),
  ('test-spike-new-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_spike_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW() - INTERVAL '4 days'),
  ('test-spike-new-003', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_spike_001", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW() - INTERVAL '6 days');
```

### 5.4 Verify pattern_metadata was updated
```sql
SELECT * FROM pattern_metadata;
```

**Expected Output:**
```
 id | department_hash       | incident_type       | incident_count | last_incident_date
----+-----------------------+---------------------+----------------+--------------------
  1 | dept_high_risk_001    | sexual_harassment   |              3 | 2026-02-09
  2 | dept_high_risk_001    | verbal_harassment   |              1 | 2026-02-06
  3 | dept_high_risk_001    | discrimination      |              1 | 2026-01-30
  4 | dept_high_risk_001    | bullying            |              1 | 2026-01-20
  5 | dept_medium_risk_001  | verbal_harassment   |              1 | 2026-02-07
  6 | dept_medium_risk_001  | discrimination      |              1 | 2026-01-31
  7 | dept_medium_risk_001  | bullying            |              1 | 2026-01-24
  8 | dept_spike_001        | sexual_harassment   |              2 | 2026-02-12
  9 | dept_spike_001        | verbal_harassment   |              2 | 2026-02-08
 10 | dept_spike_001        | discrimination      |              1 | 2025-12-05
```

## Step 6: Test Pattern Detection API

### 6.1 Get All Patterns
```bash
curl http://localhost:8080/api/v1/patterns
```

**Expected Response:**
```json
[
  {
    "departmentHash": "dept_high_risk_001",
    "incidentCount": 6,
    "riskLevel": "high",
    "trendDirection": "stable",
    "lastIncident": "2026-02-09T00:00:00Z",
    "recentSpike": false,
    "incidentTypes": [
      "sexual_harassment",
      "verbal_harassment",
      "discrimination",
      "bullying"
    ]
  },
  {
    "departmentHash": "dept_medium_risk_001",
    "incidentCount": 3,
    "riskLevel": "medium",
    "trendDirection": "stable",
    "lastIncident": "2026-02-07T00:00:00Z",
    "recentSpike": false,
    "incidentTypes": [
      "verbal_harassment",
      "discrimination",
      "bullying"
    ]
  },
  {
    "departmentHash": "dept_spike_001",
    "incidentCount": 5,
    "riskLevel": "high",
    "trendDirection": "increasing",
    "lastIncident": "2026-02-12T00:00:00Z",
    "recentSpike": true,
    "incidentTypes": [
      "sexual_harassment",
      "verbal_harassment",
      "discrimination"
    ]
  }
]
```

### 6.2 Get Alerts
```bash
curl http://localhost:8080/api/v1/patterns/alerts
```

**Expected Response:**
```json
[
  {
    "id": "alert-dept_hig-1708084800",
    "alertType": "threshold_breach",
    "severity": "critical",
    "departmentHash": "dept_high_risk_001",
    "message": "Department has 6 incidents in 30 days (HIGH RISK threshold exceeded)",
    "incidentCount": 6,
    "timestamp": "2026-02-14T12:00:00Z",
    "metadata": {
      "riskLevel": "high",
      "incidentTypes": ["sexual_harassment", "verbal_harassment", "discrimination", "bullying"]
    }
  },
  {
    "id": "spike-dept_spi-1708084800",
    "alertType": "sudden_spike",
    "severity": "high",
    "departmentHash": "dept_spike_001",
    "message": "Sudden incident spike detected (50%+ increase in 7 days)",
    "incidentCount": 5,
    "timestamp": "2026-02-14T12:00:00Z",
    "metadata": {
      "trendDirection": "increasing"
    }
  }
]
```

### 6.3 Get Department Patterns (Grouped)
```bash
curl http://localhost:8080/api/v1/patterns/department
```

**Expected Response:**
```json
{
  "dept_high_risk_001": {
    "incidentCount": 6,
    "riskLevel": "high",
    "trendDirection": "stable",
    "lastIncident": "2026-02-09T00:00:00Z",
    "recentSpike": false,
    "incidentTypes": ["sexual_harassment", "verbal_harassment", "discrimination", "bullying"]
  },
  "dept_medium_risk_001": {
    "incidentCount": 3,
    "riskLevel": "medium",
    "trendDirection": "stable",
    "lastIncident": "2026-02-07T00:00:00Z",
    "recentSpike": false,
    "incidentTypes": ["verbal_harassment", "discrimination", "bullying"]
  },
  "dept_spike_001": {
    "incidentCount": 5,
    "riskLevel": "high",
    "trendDirection": "increasing",
    "lastIncident": "2026-02-12T00:00:00Z",
    "recentSpike": true,
    "incidentTypes": ["sexual_harassment", "verbal_harassment", "discrimination"]
  }
}
```

### 6.4 Get Comprehensive Report
```bash
curl http://localhost:8080/api/v1/patterns/report | jq
```

**Expected Response:**
```json
{
  "generatedAt": "2026-02-14T12:00:00Z",
  "timeRange": "Last 90 days",
  "totalDepartments": 3,
  "highRiskCount": 2,
  "mediumRiskCount": 1,
  "lowRiskCount": 0,
  "patterns": [...],
  "alerts": [...],
  "trends": {
    "increasing": 1,
    "stable": 2,
    "decreasing": 0,
    "incidentTypeDistribution": {
      "sexual_harassment": 5,
      "verbal_harassment": 4,
      "discrimination": 3,
      "bullying": 2
    }
  }
}
```

## Step 7: Monitor Scheduler

The scheduler runs automatically at midnight (00:00). To trigger immediate analysis:

### Option 1: Restart Server
```bash
# Stop server (Ctrl+C)
# Restart
go run .
# Analysis runs immediately on startup
```

### Option 2: Check Console Logs
```
============================================================
📊 PATTERN ANALYSIS REPORT
Generated: 2026-02-15T00:00:00Z
Time Range: Last 90 days
Total Departments Analyzed: 3
🔴 High Risk: 2
🟡 Medium Risk: 1
🟢 Low Risk: 0
🚨 Alerts Generated: 2
  ⚠️  [critical] threshold_breach: Department has 6 incidents in 30 days...
  ⚠️  [high] sudden_spike: Sudden incident spike detected...
⏱️  Analysis completed in 120ms
============================================================
⏰ Next scheduled analysis at: 2026-02-16T00:00:00Z
```

## 🧪 Testing Scenarios

### Scenario 1: Test Threshold Breach Alert
```sql
-- Add 2 more incidents to dept_high_risk_001 to reach 8 incidents
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-threshold-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "sexual_harassment"}'::jsonb, 
   NOW()),
  ('test-threshold-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_high_risk_001", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW());

-- Check patterns
curl http://localhost:8080/api/v1/patterns/alerts
```

### Scenario 2: Test Spike Detection
```sql
-- Add 3 incidents in last 2 days to a previously low-activity department
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-spike-001', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_new_spike", "incidentType": "bullying"}'::jsonb, 
   NOW()),
  ('test-spike-002', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_new_spike", "incidentType": "bullying"}'::jsonb, 
   NOW() - INTERVAL '1 day'),
  ('test-spike-003', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_new_spike", "incidentType": "verbal_harassment"}'::jsonb, 
   NOW() - INTERVAL '2 days');

-- Check for spike alert
curl http://localhost:8080/api/v1/patterns/alerts | jq '.[] | select(.alertType == "sudden_spike")'
```

### Scenario 3: Test Trend Detection
```sql
-- Create increasing trend: 1 incident 90 days ago, 5 in last 30 days
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
VALUES 
  ('test-trend-old', 'encrypted_data'::bytea, 
   '{"departmentHash": "dept_trend", "incidentType": "discrimination"}'::jsonb, 
   NOW() - INTERVAL '80 days');

INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
SELECT 
  'test-trend-new-' || generate_series,
  'encrypted_data'::bytea,
  '{"departmentHash": "dept_trend", "incidentType": "discrimination"}'::jsonb,
  NOW() - (random() * INTERVAL '30 days')
FROM generate_series(1, 5);

-- Check trend
curl http://localhost:8080/api/v1/patterns | jq '.[] | select(.departmentHash == "dept_trend")'
```

## 🔍 Troubleshooting

### Issue: "Pattern service not initialized"
**Solution:** Check database connection in console logs. Verify DB credentials in environment.

### Issue: "No patterns found"
**Solution:** Insert test data as shown in Step 5. Verify `pattern_metadata` table has data.

### Issue: Scheduler not running
**Solution:** Check console for scheduler initialization message. Verify no errors during startup.

### Issue: Database connection failed
**Solution:** 
```bash
# Verify PostgreSQL is running
pg_isready

# Check connection manually
psql -U postgres -d aawaaj -c "SELECT COUNT(*) FROM complaints;"
```

### Issue: Trigger not updating pattern_metadata
**Solution:**
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_update_pattern_metadata';

-- Manually run trigger if needed
SELECT update_pattern_metadata();
```

## 📊 Integration with Authority Dashboard

The Pattern Analytics component in the Authority Dashboard uses these endpoints:

```javascript
// In frontend/src/services/api.js
export const getPatternAnalytics = async ({ authorityId, timeRange }) => {
  const response = await axios.get('/api/v1/patterns/report', {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return response.data;
};
```

See [AUTHORITY_DASHBOARD.md](./AUTHORITY_DASHBOARD.md) for frontend integration details.

## 🎉 Success Checklist

- [ ] Database connection established
- [ ] Pattern service initialized
- [ ] Scheduler started and running
- [ ] Test data inserted (3 departments with various risk levels)
- [ ] `/api/v1/patterns` returns pattern analysis
- [ ] `/api/v1/patterns/alerts` returns alerts
- [ ] `/api/v1/patterns/report` returns comprehensive report
- [ ] Console logs show scheduled analysis at midnight
- [ ] Alerts generated for high-risk departments

## 📚 Next Steps

1. **Frontend Integration**: Connect Authority Dashboard to pattern endpoints
2. **Alert Notifications**: Configure email/SMS alerts for critical severity
3. **Data Visualization**: Build charts showing trends over time
4. **Historical Analysis**: Store analysis results for trend comparison
5. **Production Deployment**: Set up monitoring and alerting infrastructure

---

**Estimated Time**: 10-15 minutes  
**Difficulty**: Intermediate  
**Last Updated**: February 14, 2026
