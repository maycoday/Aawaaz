package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// ============================================
// PATTERN ANALYSIS TYPES
// ============================================

// PatternAnalysis represents aggregated pattern data for a department
type PatternAnalysis struct {
	DepartmentHash string    `json:"departmentHash"`
	IncidentCount  int       `json:"incidentCount"`
	RiskLevel      string    `json:"riskLevel"`      // high, medium, low
	TrendDirection string    `json:"trendDirection"` // increasing, stable, decreasing
	LastIncident   time.Time `json:"lastIncident"`
	RecentSpike    bool      `json:"recentSpike"`
	IncidentTypes  []string  `json:"incidentTypes,omitempty"`
}

// Alert represents a pattern-based alert
type Alert struct {
	ID             string    `json:"id"`
	AlertType      string    `json:"alertType"` // threshold_breach, sudden_spike, new_unsafe_zone
	Severity       string    `json:"severity"`  // critical, high, medium
	DepartmentHash string    `json:"departmentHash"`
	Message        string    `json:"message"`
	IncidentCount  int       `json:"incidentCount"`
	Timestamp      time.Time `json:"timestamp"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// PatternReport represents a comprehensive analysis report
type PatternReport struct {
	GeneratedAt      time.Time          `json:"generatedAt"`
	TimeRange        string             `json:"timeRange"`
	TotalDepartments int                `json:"totalDepartments"`
	HighRiskCount    int                `json:"highRiskCount"`
	MediumRiskCount  int                `json:"mediumRiskCount"`
	LowRiskCount     int                `json:"lowRiskCount"`
	Patterns         []PatternAnalysis  `json:"patterns"`
	Alerts           []Alert            `json:"alerts"`
	Trends           map[string]interface{} `json:"trends"`
}

// TimeWindowData holds incident counts for different time windows
type TimeWindowData struct {
	Last7Days  int
	Last30Days int
	Last90Days int
}

// ============================================
// PATTERN SERVICE
// ============================================

// PatternService handles ethical pattern detection
type PatternService struct {
	db *sql.DB
}

// NewPatternService creates a new pattern service instance
func NewPatternService(db *sql.DB) *PatternService {
	return &PatternService{db: db}
}

// ============================================
// CORE ANALYSIS METHODS
// ============================================

// AnalyzePatterns performs comprehensive pattern analysis
// Returns aggregated patterns with risk scoring and trend detection
func (ps *PatternService) AnalyzePatterns() ([]PatternAnalysis, error) {
	log.Println("🔍 Starting ethical pattern analysis...")

	query := `
		SELECT 
			pm.department_hash,
			pm.incident_type,
			pm.incident_count,
			pm.last_incident_date
		FROM pattern_metadata pm
		WHERE pm.department_hash IS NOT NULL
		ORDER BY pm.incident_count DESC
	`

	rows, err := ps.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query pattern metadata: %w", err)
	}
	defer rows.Close()

	// Map to aggregate by department
	deptMap := make(map[string]*PatternAnalysis)

	for rows.Next() {
		var deptHash, incidentType string
		var incidentCount int
		var lastIncident time.Time

		if err := rows.Scan(&deptHash, &incidentType, &incidentCount, &lastIncident); err != nil {
			log.Printf("⚠️  Error scanning row: %v", err)
			continue
		}

		// Aggregate by department
		if analysis, exists := deptMap[deptHash]; exists {
			analysis.IncidentCount += incidentCount
			if lastIncident.After(analysis.LastIncident) {
				analysis.LastIncident = lastIncident
			}
			analysis.IncidentTypes = append(analysis.IncidentTypes, incidentType)
		} else {
			deptMap[deptHash] = &PatternAnalysis{
				DepartmentHash: deptHash,
				IncidentCount:  incidentCount,
				LastIncident:   lastIncident,
				IncidentTypes:  []string{incidentType},
			}
		}
	}

	// Convert map to slice and calculate risk/trends
	patterns := make([]PatternAnalysis, 0, len(deptMap))
	for _, analysis := range deptMap {
		// Get time-windowed data for this department
		timeData, err := ps.getTimeWindowData(analysis.DepartmentHash)
		if err != nil {
			log.Printf("⚠️  Error getting time window data for %s: %v", analysis.DepartmentHash, err)
			timeData = &TimeWindowData{} // Use empty data as fallback
		}

		// Calculate risk level based on 30-day window
		analysis.RiskLevel = ps.calculateRiskLevel(timeData.Last30Days)

		// Calculate trend direction (30-day vs 90-day average)
		analysis.TrendDirection = ps.calculateTrend(timeData)

		// Detect recent spikes (50%+ increase in last 7 days)
		analysis.RecentSpike = ps.detectSpike(timeData)

		patterns = append(patterns, *analysis)
	}

	log.Printf("✅ Pattern analysis complete: %d departments analyzed", len(patterns))
	return patterns, nil
}

// DetectSpikes identifies departments with sudden incident spikes
func (ps *PatternService) DetectSpikes() ([]Alert, error) {
	log.Println("🚨 Detecting incident spikes...")

	patterns, err := ps.AnalyzePatterns()
	if err != nil {
		return nil, fmt.Errorf("failed to analyze patterns: %w", err)
	}

	alerts := make([]Alert, 0)
	now := time.Now()

	for _, pattern := range patterns {
		// Alert 1: Threshold Breach (High Risk)
		if pattern.RiskLevel == "high" {
			alerts = append(alerts, Alert{
				ID:             fmt.Sprintf("alert-%s-%d", pattern.DepartmentHash[:8], now.Unix()),
				AlertType:      "threshold_breach",
				Severity:       "critical",
				DepartmentHash: pattern.DepartmentHash,
				Message:        fmt.Sprintf("Department has %d incidents in 30 days (HIGH RISK threshold exceeded)", pattern.IncidentCount),
				IncidentCount:  pattern.IncidentCount,
				Timestamp:      now,
				Metadata: map[string]interface{}{
					"riskLevel": pattern.RiskLevel,
					"incidentTypes": pattern.IncidentTypes,
				},
			})
		}

		// Alert 2: Sudden Spike
		if pattern.RecentSpike {
			alerts = append(alerts, Alert{
				ID:             fmt.Sprintf("spike-%s-%d", pattern.DepartmentHash[:8], now.Unix()),
				AlertType:      "sudden_spike",
				Severity:       "high",
				DepartmentHash: pattern.DepartmentHash,
				Message:        fmt.Sprintf("Sudden incident spike detected (50%+ increase in 7 days)"),
				IncidentCount:  pattern.IncidentCount,
				Timestamp:      now,
				Metadata: map[string]interface{}{
					"trendDirection": pattern.TrendDirection,
				},
			})
		}

		// Alert 3: New Unsafe Zone (first high-risk detection)
		if pattern.RiskLevel == "high" && ps.isNewUnsafeZone(pattern.DepartmentHash) {
			alerts = append(alerts, Alert{
				ID:             fmt.Sprintf("newzone-%s-%d", pattern.DepartmentHash[:8], now.Unix()),
				AlertType:      "new_unsafe_zone",
				Severity:       "high",
				DepartmentHash: pattern.DepartmentHash,
				Message:        fmt.Sprintf("New high-risk zone identified - immediate attention required"),
				IncidentCount:  pattern.IncidentCount,
				Timestamp:      now,
				Metadata: map[string]interface{}{
					"lastIncident": pattern.LastIncident,
				},
			})
		}

		// Alert 4: Increasing Trend
		if pattern.TrendDirection == "increasing" && pattern.RiskLevel == "medium" {
			alerts = append(alerts, Alert{
				ID:             fmt.Sprintf("trend-%s-%d", pattern.DepartmentHash[:8], now.Unix()),
				AlertType:      "increasing_trend",
				Severity:       "medium",
				DepartmentHash: pattern.DepartmentHash,
				Message:        fmt.Sprintf("Increasing incident trend detected - monitor closely"),
				IncidentCount:  pattern.IncidentCount,
				Timestamp:      now,
				Metadata: map[string]interface{}{
					"trendDirection": pattern.TrendDirection,
				},
			})
		}
	}

	log.Printf("✅ Spike detection complete: %d alerts generated", len(alerts))
	return alerts, nil
}

// GenerateReport creates a comprehensive pattern analysis report
func (ps *PatternService) GenerateReport() (*PatternReport, error) {
	log.Println("📊 Generating pattern analysis report...")

	patterns, err := ps.AnalyzePatterns()
	if err != nil {
		return nil, fmt.Errorf("failed to analyze patterns: %w", err)
	}

	alerts, err := ps.DetectSpikes()
	if err != nil {
		return nil, fmt.Errorf("failed to detect spikes: %w", err)
	}

	// Count risk levels
	var highRisk, mediumRisk, lowRisk int
	for _, p := range patterns {
		switch p.RiskLevel {
		case "high":
			highRisk++
		case "medium":
			mediumRisk++
		case "low":
			lowRisk++
		}
	}

	// Calculate overall trends
	trends := ps.calculateOverallTrends(patterns)

	report := &PatternReport{
		GeneratedAt:      time.Now(),
		TimeRange:        "Last 90 days",
		TotalDepartments: len(patterns),
		HighRiskCount:    highRisk,
		MediumRiskCount:  mediumRisk,
		LowRiskCount:     lowRisk,
		Patterns:         patterns,
		Alerts:           alerts,
		Trends:           trends,
	}

	log.Printf("✅ Report generated: %d departments, %d alerts", len(patterns), len(alerts))
	return report, nil
}

// ============================================
// HELPER METHODS
// ============================================

// getTimeWindowData retrieves incident counts for different time windows
func (ps *PatternService) getTimeWindowData(deptHash string) (*TimeWindowData, error) {
	now := time.Now()
	sevenDaysAgo := now.AddDate(0, 0, -7)
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	ninetyDaysAgo := now.AddDate(0, 0, -90)

	query := `
		SELECT 
			COUNT(*) FILTER (WHERE c.created_at >= $1) as last_7_days,
			COUNT(*) FILTER (WHERE c.created_at >= $2) as last_30_days,
			COUNT(*) FILTER (WHERE c.created_at >= $3) as last_90_days
		FROM complaints c
		WHERE c.anonymized_metadata->>'departmentHash' = $4
	`

	var data TimeWindowData
	err := ps.db.QueryRow(query, sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo, deptHash).
		Scan(&data.Last7Days, &data.Last30Days, &data.Last90Days)

	if err != nil {
		return nil, fmt.Errorf("failed to query time window data: %w", err)
	}

	return &data, nil
}

// calculateRiskLevel determines risk level based on 30-day incident count
func (ps *PatternService) calculateRiskLevel(count30Days int) string {
	if count30Days >= 5 {
		return "high"
	} else if count30Days >= 3 {
		return "medium"
	} else if count30Days >= 1 {
		return "low"
	}
	return "none"
}

// calculateTrend determines if incidents are increasing, stable, or decreasing
func (ps *PatternService) calculateTrend(data *TimeWindowData) string {
	// Compare recent 30 days to previous 60 days average
	if data.Last90Days == 0 {
		return "stable"
	}

	// Calculate daily average for 30 days and previous 60 days
	recent30DayAvg := float64(data.Last30Days) / 30.0
	previous60Days := data.Last90Days - data.Last30Days
	previous60DayAvg := float64(previous60Days) / 60.0

	if previous60DayAvg == 0 {
		if recent30DayAvg > 0 {
			return "increasing"
		}
		return "stable"
	}

	ratio := recent30DayAvg / previous60DayAvg

	if ratio > 1.2 {
		return "increasing"
	} else if ratio < 0.8 {
		return "decreasing"
	}
	return "stable"
}

// detectSpike checks for sudden spike (50%+ increase in 7 days vs previous period)
func (ps *PatternService) detectSpike(data *TimeWindowData) bool {
	if data.Last30Days == 0 || data.Last7Days == 0 {
		return false
	}

	// Calculate daily average for last 7 days and previous 23 days
	last7DayAvg := float64(data.Last7Days) / 7.0
	previous23Days := data.Last30Days - data.Last7Days
	previous23DayAvg := float64(previous23Days) / 23.0

	if previous23DayAvg == 0 {
		// If there were incidents in last 7 days but none before, it's a spike
		return data.Last7Days > 0
	}

	// Check if 50% or more increase
	ratio := last7DayAvg / previous23DayAvg
	return ratio >= 1.5
}

// isNewUnsafeZone checks if this is the first time a department reached high risk
func (ps *PatternService) isNewUnsafeZone(deptHash string) bool {
	// Check if this department was previously flagged
	// For now, check if incidents started recently (within last 30 days)
	query := `
		SELECT MIN(c.created_at)
		FROM complaints c
		WHERE c.anonymized_metadata->>'departmentHash' = $1
	`

	var firstIncident time.Time
	err := ps.db.QueryRow(query, deptHash).Scan(&firstIncident)
	if err != nil {
		return false
	}

	// If first incident was within last 30 days, it's a new zone
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	return firstIncident.After(thirtyDaysAgo)
}

// calculateOverallTrends generates aggregate trend statistics
func (ps *PatternService) calculateOverallTrends(patterns []PatternAnalysis) map[string]interface{} {
	trends := make(map[string]interface{})

	var increasing, stable, decreasing int
	for _, p := range patterns {
		switch p.TrendDirection {
		case "increasing":
			increasing++
		case "stable":
			stable++
		case "decreasing":
			decreasing++
		}
	}

	trends["increasing"] = increasing
	trends["stable"] = stable
	trends["decreasing"] = decreasing

	// Calculate incident type distribution
	typeMap := make(map[string]int)
	for _, p := range patterns {
		for _, incType := range p.IncidentTypes {
			typeMap[incType]++
		}
	}
	trends["incidentTypeDistribution"] = typeMap

	return trends
}

// ============================================
// PERIODIC SCHEDULER
// ============================================

// StartScheduler runs pattern analysis periodically (daily at midnight)
func (ps *PatternService) StartScheduler() {
	log.Println("🕐 Starting pattern analysis scheduler (daily at midnight)...")

	// Run immediately on startup
	go func() {
		log.Println("🚀 Running initial pattern analysis...")
		if err := ps.runScheduledAnalysis(); err != nil {
			log.Printf("❌ Error in initial analysis: %v", err)
		}
	}()

	// Schedule daily runs at midnight
	go func() {
		for {
			now := time.Now()
			// Calculate time until next midnight
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			durationUntilMidnight := time.Until(nextMidnight)

			log.Printf("⏰ Next scheduled analysis at: %s (in %s)", nextMidnight.Format(time.RFC3339), durationUntilMidnight)

			// Wait until midnight
			time.Sleep(durationUntilMidnight)

			// Run analysis
			log.Println("🔄 Running scheduled pattern analysis...")
			if err := ps.runScheduledAnalysis(); err != nil {
				log.Printf("❌ Error in scheduled analysis: %v", err)
			}
		}
	}()
}

// runScheduledAnalysis executes the analysis and logs results
func (ps *PatternService) runScheduledAnalysis() error {
	startTime := time.Now()

	// Generate full report
	report, err := ps.GenerateReport()
	if err != nil {
		return fmt.Errorf("failed to generate report: %w", err)
	}

	// Log summary
	log.Println(strings.Repeat("=", 60))
	log.Println("📊 PATTERN ANALYSIS REPORT")
	log.Printf("Generated: %s", report.GeneratedAt.Format(time.RFC3339))
	log.Printf("Time Range: %s", report.TimeRange)
	log.Printf("Total Departments Analyzed: %d", report.TotalDepartments)
	log.Printf("🔴 High Risk: %d", report.HighRiskCount)
	log.Printf("🟡 Medium Risk: %d", report.MediumRiskCount)
	log.Printf("🟢 Low Risk: %d", report.LowRiskCount)
	log.Printf("🚨 Alerts Generated: %d", len(report.Alerts))

	// Log critical alerts
	for _, alert := range report.Alerts {
		if alert.Severity == "critical" || alert.Severity == "high" {
			log.Printf("  ⚠️  [%s] %s: %s", alert.Severity, alert.AlertType, alert.Message)
		}
	}

	log.Printf("⏱️  Analysis completed in %s", time.Since(startTime))
	log.Println(strings.Repeat("=", 60))

	// Store alerts in database (optional - for persistence)
	// ps.storeAlerts(report.Alerts)

	return nil
}

// ============================================
// ETHICAL CONSTRAINTS
// ============================================

/*
ETHICAL DESIGN PRINCIPLES:

1. ANONYMITY PRESERVED:
   - Only uses department_hash (SHA-256 hashed)
   - Never exposes actual department names
   - No linkage to individual reports

2. AGGREGATE STATISTICS ONLY:
   - Works with counts and trends
   - No access to complaint content
   - No personally identifiable information

3. PURPOSE LIMITATION:
   - Used solely for identifying unsafe patterns
   - Not for surveillance or individual tracking
   - Helps allocate resources to high-risk areas

4. TRANSPARENCY:
   - All queries and methods are documented
   - Clear explanation of risk scoring
   - Audit trail available

5. DATA MINIMIZATION:
   - Only queries necessary fields
   - Time-limited analysis windows
   - No unnecessary data retention

6. ACCOUNTABILITY:
   - All analysis actions are logged
   - Results are reviewable
   - Clear reasoning for risk levels
*/
