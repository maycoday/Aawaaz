# Pattern Detection Service

## Overview
The Pattern Detection Service is an ethical AI component designed to identify harassment patterns without compromising individual privacy. It analyzes anonymized metadata to detect unsafe workplace zones and trends.

## 🎯 Purpose
- **Identify high-risk departments** using anonymized data
- **Detect sudden incident spikes** requiring immediate attention
- **Track trends** (increasing/stable/decreasing) over time
- **Generate automated alerts** for threshold breaches
- **Support resource allocation** to high-risk areas

## 🔒 Ethical Design Principles

### 1. Anonymity Preserved
```
✅ Uses department_hash (SHA-256 hashed)
✅ Never exposes actual department names
✅ No linkage to individual reports
✅ No access to complaint content
```

### 2. Aggregate Statistics Only
```
✅ Works with counts and trends
✅ Time-windowed analysis (7/30/90 days)
✅ No personally identifiable information
✅ Zero-knowledge architecture maintained
```

### 3. Purpose Limitation
```
✅ Used solely for identifying unsafe patterns
✅ Not for surveillance or individual tracking
✅ Helps allocate resources to high-risk areas
✅ Transparent methodology
```

### 4. Data Minimization
```
✅ Queries only necessary fields
✅ Time-limited analysis windows
✅ No unnecessary data retention
✅ Automated cleanup policies
```

## 🏗️ Architecture

### Core Components

#### 1. **PatternService**
Main service class handling all pattern detection operations.

```go
type PatternService struct {
    db *sql.DB
}
```

#### 2. **Analysis Types**

**PatternAnalysis**
```go
type PatternAnalysis struct {
    DepartmentHash string    // SHA-256 hashed department ID
    IncidentCount  int       // Total incidents in time window
    RiskLevel      string    // "high", "medium", "low"
    TrendDirection string    // "increasing", "stable", "decreasing"
    LastIncident   time.Time // Most recent incident timestamp
    RecentSpike    bool      // True if 50%+ increase in 7 days
    IncidentTypes  []string  // Types of incidents (harassment types)
}
```

**Alert**
```go
type Alert struct {
    ID             string    // Unique alert identifier
    AlertType      string    // Type of alert (see below)
    Severity       string    // "critical", "high", "medium"
    DepartmentHash string    // Affected department (hashed)
    Message        string    // Human-readable alert message
    IncidentCount  int       // Number of incidents triggering alert
    Timestamp      time.Time // When alert was generated
    Metadata       map[string]interface{} // Additional context
}
```

**PatternReport**
```go
type PatternReport struct {
    GeneratedAt      time.Time
    TimeRange        string
    TotalDepartments int
    HighRiskCount    int
    MediumRiskCount  int
    LowRiskCount     int
    Patterns         []PatternAnalysis
    Alerts           []Alert
    Trends           map[string]interface{}
}
```

## 📊 Risk Scoring Algorithm

### Risk Levels (Based on 30-day window)

| Risk Level | Criteria | Action Required |
|------------|----------|-----------------|
| **HIGH** (🔴) | 5+ incidents in 30 days | Immediate intervention |
| **MEDIUM** (🟡) | 3-4 incidents in 30 days | Close monitoring |
| **LOW** (🟢) | 1-2 incidents in 30 days | Routine oversight |

### Formula
```go
func calculateRiskLevel(count30Days int) string {
    if count30Days >= 5 {
        return "high"
    } else if count30Days >= 3 {
        return "medium"
    } else if count30Days >= 1 {
        return "low"
    }
    return "none"
}
```

## 📈 Trend Detection Algorithm

### Methodology
Compares **recent 30-day average** with **previous 60-day average** to determine trend direction.

```go
func calculateTrend(data *TimeWindowData) string {
    recent30DayAvg := float64(data.Last30Days) / 30.0
    previous60Days := data.Last90Days - data.Last30Days
    previous60DayAvg := float64(previous60Days) / 60.0
    
    ratio := recent30DayAvg / previous60DayAvg
    
    if ratio > 1.2 {
        return "increasing"  // 20%+ increase
    } else if ratio < 0.8 {
        return "decreasing"  // 20%+ decrease
    }
    return "stable"
}
```

### Classifications
- **Increasing**: Recent incidents 20%+ higher than historical average
- **Stable**: Within ±20% of historical average
- **Decreasing**: Recent incidents 20%+ lower than historical average

## 🚨 Alert Types

### 1. Threshold Breach
**Trigger**: Department reaches HIGH risk level (5+ incidents in 30 days)  
**Severity**: CRITICAL  
**Action**: Immediate review and intervention required

```json
{
  "alertType": "threshold_breach",
  "severity": "critical",
  "message": "Department has 7 incidents in 30 days (HIGH RISK threshold exceeded)"
}
```

### 2. Sudden Spike
**Trigger**: 50%+ increase in last 7 days compared to previous 23 days  
**Severity**: HIGH  
**Action**: Investigate recent changes or events

```json
{
  "alertType": "sudden_spike",
  "severity": "high",
  "message": "Sudden incident spike detected (50%+ increase in 7 days)"
}
```

### 3. New Unsafe Zone
**Trigger**: Department reaches HIGH risk for first time  
**Severity**: HIGH  
**Action**: Establish monitoring and intervention protocols

```json
{
  "alertType": "new_unsafe_zone",
  "severity": "high",
  "message": "New high-risk zone identified - immediate attention required"
}
```

### 4. Increasing Trend
**Trigger**: MEDIUM risk department with increasing trend  
**Severity**: MEDIUM  
**Action**: Monitor closely and prepare interventions

```json
{
  "alertType": "increasing_trend",
  "severity": "medium",
  "message": "Increasing incident trend detected - monitor closely"
}
```

## 🔌 API Endpoints

### 1. Get Pattern Analysis
```http
GET /api/v1/patterns
```

**Response:**
```json
[
  {
    "departmentHash": "a1b2c3d4e5f6...",
    "incidentCount": 7,
    "riskLevel": "high",
    "trendDirection": "increasing",
    "lastIncident": "2026-02-14T10:30:00Z",
    "recentSpike": true,
    "incidentTypes": ["sexual_harassment", "verbal_harassment"]
  }
]
```

### 2. Get Department Patterns (Grouped)
```http
GET /api/v1/patterns/department
```

**Response:**
```json
{
  "a1b2c3d4e5f6...": {
    "incidentCount": 7,
    "riskLevel": "high",
    "trendDirection": "increasing",
    "lastIncident": "2026-02-14T10:30:00Z",
    "recentSpike": true,
    "incidentTypes": ["sexual_harassment", "verbal_harassment"]
  }
}
```

### 3. Get Alerts
```http
GET /api/v1/patterns/alerts
```

**Response:**
```json
[
  {
    "id": "alert-a1b2c3d4-1708084800",
    "alertType": "threshold_breach",
    "severity": "critical",
    "departmentHash": "a1b2c3d4e5f6...",
    "message": "Department has 7 incidents in 30 days (HIGH RISK threshold exceeded)",
    "incidentCount": 7,
    "timestamp": "2026-02-14T12:00:00Z",
    "metadata": {
      "riskLevel": "high",
      "incidentTypes": ["sexual_harassment", "verbal_harassment"]
    }
  }
]
```

### 4. Get Comprehensive Report
```http
GET /api/v1/patterns/report
```

**Response:**
```json
{
  "generatedAt": "2026-02-14T12:00:00Z",
  "timeRange": "Last 90 days",
  "totalDepartments": 15,
  "highRiskCount": 2,
  "mediumRiskCount": 5,
  "lowRiskCount": 8,
  "patterns": [...],
  "alerts": [...],
  "trends": {
    "increasing": 3,
    "stable": 8,
    "decreasing": 4,
    "incidentTypeDistribution": {
      "sexual_harassment": 12,
      "verbal_harassment": 8,
      "discrimination": 5
    }
  }
}
```

## ⏰ Scheduled Analysis

### Daily Scheduler
The service runs comprehensive analysis automatically **every day at midnight**.

```go
patternService.StartScheduler()
```

**What it does:**
1. Runs full pattern analysis on all departments
2. Generates alerts for high-risk zones and spikes
3. Logs summary to console with risk breakdown
4. Potential: Send email notifications to authorities
5. Potential: Store alerts in database for historical tracking

**Console Output:**
```
============================================================
📊 PATTERN ANALYSIS REPORT
Generated: 2026-02-14T00:00:00Z
Time Range: Last 90 days
Total Departments Analyzed: 15
🔴 High Risk: 2
🟡 Medium Risk: 5
🟢 Low Risk: 8
🚨 Alerts Generated: 4
  ⚠️  [critical] threshold_breach: Department has 7 incidents...
  ⚠️  [high] sudden_spike: Sudden incident spike detected...
⏱️  Analysis completed in 450ms
============================================================
```

## 🗄️ Database Queries

### Tables Used
The service queries only the `pattern_metadata` and `complaints` tables:

```sql
-- pattern_metadata: Aggregated pattern data
SELECT 
    department_hash,
    incident_type,
    incident_count,
    last_incident_date
FROM pattern_metadata
WHERE department_hash IS NOT NULL
ORDER BY incident_count DESC
```

```sql
-- complaints: Time-windowed incident counts
SELECT 
    COUNT(*) FILTER (WHERE created_at >= $1) as last_7_days,
    COUNT(*) FILTER (WHERE created_at >= $2) as last_30_days,
    COUNT(*) FILTER (WHERE created_at >= $3) as last_90_days
FROM complaints
WHERE anonymized_metadata->>'departmentHash' = $4
```

### Privacy Guarantees
- ✅ **Never queries `encrypted_payload`** (complaint content)
- ✅ **Never joins with reporter information**
- ✅ **Only uses hashed department IDs**
- ✅ **No access to complainant metadata**

## 🧪 Testing

### Manual Testing
```bash
# Start backend
cd backend
go run .

# Test pattern analysis endpoint
curl http://localhost:8080/api/v1/patterns

# Test alerts endpoint
curl http://localhost:8080/api/v1/patterns/alerts

# Test comprehensive report
curl http://localhost:8080/api/v1/patterns/report
```

### Sample Test Data
Insert test complaints with various department hashes to see pattern detection in action:

```sql
-- Create test department with HIGH risk (5+ incidents in 30 days)
INSERT INTO complaints (id, encrypted_payload, anonymized_metadata, created_at)
SELECT 
    'test-' || generate_series(1, 6),
    'encrypted_test_data'::bytea,
    jsonb_build_object(
        'departmentHash', 'test_high_risk_dept',
        'incidentType', 'sexual_harassment',
        'timestamp', NOW() - (random() * interval '30 days')
    ),
    NOW() - (random() * interval '30 days');
```

## 📋 Use Cases

### 1. HR Dashboard Integration
Display high-risk departments in real-time dashboard with risk levels and trends.

### 2. Automated Alerts
Send email notifications to HR/ICC when thresholds are breached.

### 3. Resource Allocation
Prioritize training and intervention programs for high-risk departments.

### 4. Trend Monitoring
Track effectiveness of interventions by monitoring trend direction changes.

### 5. Compliance Reporting
Generate monthly reports for compliance and legal requirements.

## 🔧 Configuration

### Environment Variables
```bash
# Database configuration (required)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aawaaj
DB_SSL_MODE=disable
```

### Scheduler Configuration
Modify scheduler in `pattern_service.go`:

```go
// Run every 6 hours instead of daily
go func() {
    for {
        time.Sleep(6 * time.Hour)
        ps.runScheduledAnalysis()
    }
}()
```

## 🚀 Production Considerations

### 1. Performance Optimization
- Add database indexes on `created_at` and `anonymized_metadata->'departmentHash'`
- Implement caching for frequently accessed patterns
- Use read replicas for analytics queries

### 2. Alert Persistence
Store alerts in database for historical tracking:

```sql
CREATE TABLE pattern_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    department_hash VARCHAR(64),
    message TEXT,
    incident_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Notification Integration
Integrate with email/SMS services to notify authorities:

```go
func (ps *PatternService) sendAlertNotifications(alerts []Alert) {
    for _, alert := range alerts {
        if alert.Severity == "critical" || alert.Severity == "high" {
            // Send email/SMS to relevant authorities
            sendEmail(alert.Message)
        }
    }
}
```

### 4. Audit Logging
Log all pattern analysis operations:

```sql
INSERT INTO authority_actions (action_type, metadata)
VALUES ('pattern_analysis_run', jsonb_build_object(
    'departments_analyzed', 15,
    'alerts_generated', 4,
    'high_risk_count', 2
));
```

## 📚 References

### Related Documentation
- [database_schema.sql](./database_schema.sql) - Database schema with pattern_metadata table
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [AUTHORITY_DASHBOARD.md](./AUTHORITY_DASHBOARD.md) - Authority dashboard integration

### Academic References
- "Privacy-Preserving Data Mining" - Agrawal & Srikant (2000)
- "Differential Privacy" - Dwork (2006)
- "K-Anonymity" - Sweeney (2002)

### Ethical Guidelines
- GDPR Article 25: Data Protection by Design
- IEEE Ethics in AI
- ACM Code of Ethics: Privacy and Confidentiality

## 📞 Support

For questions or issues with the pattern detection service:
- Review logs in backend console
- Check database connection and schema
- Verify `pattern_metadata` table is being updated by trigger
- Ensure sufficient test data for meaningful patterns

---

**Last Updated**: February 14, 2026  
**Version**: 1.0  
**Maintainer**: Aawaaz Development Team
