import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import '../styles/PatternAnalytics.css';

const PatternAnalytics = () => {
  const { authority, refreshSession } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all

  useEffect(() => {
    fetchAnalytics();
    refreshSession();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getPatternAnalytics({
        authorityId: authority.id,
        timeRange
      });

      if (response.success) {
        setAnalyticsData(response.analytics);
      } else {
        setError(response.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('An error occurred while fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!analyticsData) return;

    const csvRows = [
      ['Incident Type', 'Count', 'Pending', 'Reviewing', 'Resolved'],
      ...analyticsData.byType.map(item => [
        item.type,
        item.total,
        item.pending,
        item.reviewing,
        item.resolved
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // In a real implementation, use a library like jsPDF
    alert('PDF export feature - integrate jsPDF or similar library for production use');
  };

  if (loading && !analyticsData) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <h2>Error Loading Analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Mock data for demonstration if API doesn't return data yet
  const mockData = {
    summary: {
      totalComplaints: 65,
      pending: 12,
      underReview: 8,
      resolved: 45,
      avgResolutionTime: '12.5 days'
    },
    byType: [
      { type: 'verbal', total: 25, pending: 5, reviewing: 3, resolved: 17 },
      { type: 'sexual', total: 18, pending: 3, reviewing: 2, resolved: 13 },
      { type: 'bullying', total: 12, pending: 2, reviewing: 2, resolved: 8 },
      { type: 'discrimination', total: 6, pending: 1, reviewing: 1, resolved: 4 },
      { type: 'physical', total: 4, pending: 1, reviewing: 0, resolved: 3 }
    ],
    patterns: [
      { departmentHash: '5e88489...', count: 8, riskLevel: 'HIGH', lastIncident: '2026-02-10' },
      { departmentHash: '7c9e6f7...', count: 5, riskLevel: 'MEDIUM', lastIncident: '2026-02-08' },
      { departmentHash: 'a3b5c2d...', count: 4, riskLevel: 'MEDIUM', lastIncident: '2026-02-05' },
      { departmentHash: 'f1e8d9c...', count: 2, riskLevel: 'LOW', lastIncident: '2026-01-28' }
    ],
    timeline: [
      { date: '2026-01-15', count: 3 },
      { date: '2026-01-22', count: 5 },
      { date: '2026-01-29', count: 4 },
      { date: '2026-02-05', count: 7 },
      { date: '2026-02-12', count: 6 }
    ]
  };

  const data = analyticsData || mockData;

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <div>
          <h1>Pattern Analytics</h1>
          <p>Aggregate analysis of complaint patterns and trends</p>
        </div>
        <div className="header-actions">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={exportToCSV} className="export-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Export CSV
          </button>
          <button onClick={exportToPDF} className="export-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Export PDF
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon total">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-label">Total Complaints</div>
            <div className="summary-value">{data.summary.totalComplaints}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon pending">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-label">Pending</div>
            <div className="summary-value">{data.summary.pending}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon reviewing">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-label">Under Review</div>
            <div className="summary-value">{data.summary.underReview}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon resolved">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.76489 14.1003 1.98232 16.07 2.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-label">Resolved</div>
            <div className="summary-value">{data.summary.resolved}</div>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Complaints by Type */}
        <div className="analytics-card wide">
          <div className="card-header">
            <h2>Complaints by Type</h2>
          </div>
          <div className="card-body">
            <div className="chart-container">
              {data.byType.map((item, idx) => {
                const maxTotal = Math.max(...data.byType.map(i => i.total));
                const percentage = (item.total / maxTotal) * 100;
                
                return (
                  <div key={idx} className="bar-chart-row">
                    <div className="bar-label">{item.type}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="bar-value">{item.total}</span>
                      </div>
                    </div>
                    <div className="bar-breakdown">
                      <span className="breakdown-pending">{item.pending}P</span>
                      <span className="breakdown-reviewing">{item.reviewing}R</span>
                      <span className="breakdown-resolved">{item.resolved}✓</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pattern Detection Heatmap */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Pattern Detection</h2>
          </div>
          <div className="card-body">
            <div className="pattern-heatmap">
              {data.patterns.map((pattern, idx) => (
                <div key={idx} className={`pattern-item risk-${pattern.riskLevel.toLowerCase()}`}>
                  <div className="pattern-header">
                    <code className="department-hash">{pattern.departmentHash}</code>
                    <span className={`risk-badge ${pattern.riskLevel.toLowerCase()}`}>
                      {pattern.riskLevel}
                    </span>
                  </div>
                  <div className="pattern-details">
                    <div className="pattern-count">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {pattern.count} incidents
                    </div>
                    <div className="pattern-date">
                      Last: {new Date(pattern.lastIncident).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Incident Timeline</h2>
          </div>
          <div className="card-body">
            <div className="timeline-chart">
              {data.timeline.map((point, idx) => {
                const maxCount = Math.max(...data.timeline.map(p => p.count));
                const height = (point.count / maxCount) * 100;
                
                return (
                  <div key={idx} className="timeline-bar-wrapper">
                    <div className="timeline-bar" style={{ height: `${height}%` }}>
                      <span className="timeline-value">{point.count}</span>
                    </div>
                    <div className="timeline-label">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="analytics-card insights-card">
        <div className="card-header">
          <h2>Key Insights</h2>
        </div>
        <div className="card-body">
          <div className="insights-grid">
            <div className="insight-item">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <strong>High Activity Department</strong>
                <p>Department {data.patterns[0]?.departmentHash.substring(0, 8)}... has {data.patterns[0]?.count} reported incidents</p>
              </div>
            </div>
            
            <div className="insight-item">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V11C2 16.55 5.84 21.74 12 23C18.16 21.74 22 16.55 22 11V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>
                <strong>Pattern Alert</strong>
                <p>{data.patterns.filter(p => p.riskLevel === 'HIGH').length} departments flagged as high-risk</p>
              </div>
            </div>

            <div className="insight-item">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>
                <strong>Average Resolution Time</strong>
                <p>{data.summary.avgResolutionTime}</p>
              </div>
            </div>

            <div className="insight-item">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <strong>Most Common Type</strong>
                <p>{data.byType[0]?.type} harassment ({data.byType[0]?.total} cases)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternAnalytics;
