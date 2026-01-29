import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

function PatternDetection() {
  const [patterns, setPatterns] = useState([]);
  const [departmentStats, setDepartmentStats] = useState({});

  useEffect(() => {
    // Fetch patterns from API
    apiService.getPatterns()
      .then(data => setPatterns(data))
      .catch(err => console.error('Failed to load patterns:', err));

    apiService.getDepartmentPatterns()
      .then(data => setDepartmentStats(data))
      .catch(err => console.error('Failed to load department stats:', err));
  }, []);

  return (
    <section id="patterns" className="patterns-section">
      <h2>Pattern Detection Insights</h2>
      <p className="section-subtitle">Anonymized metadata helps identify systemic issues</p>
      
      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-header">
            <h3>Department Trends</h3>
            <span className="badge">Anonymized</span>
          </div>
          <div className="chart-placeholder">
            {Object.entries(departmentStats).map(([dept, stats]) => (
              <div 
                key={dept}
                className="bar" 
                style={{ 
                  height: `${(stats.total / 20) * 100}%`,
                  '--color': stats.total > 3 ? '#ef4444' : '#10b981'
                }}
              >
                <span className="bar-label">{dept.slice(0, 3)}</span>
                <span className="bar-value">{stats.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-header">
            <h3>Incident Types</h3>
            <span className="badge">Last 30 Days</span>
          </div>
          <div className="incident-list">
            <div className="incident-item">
              <span>Sexual Harassment</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: '40%' }}></div>
              </div>
              <span>40%</span>
            </div>
            <div className="incident-item">
              <span>Verbal Abuse</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: '30%' }}></div>
              </div>
              <span>30%</span>
            </div>
            <div className="incident-item">
              <span>Discrimination</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: '20%' }}></div>
              </div>
              <span>20%</span>
            </div>
            <div className="incident-item">
              <span>Retaliation</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: '10%' }}></div>
              </div>
              <span>10%</span>
            </div>
          </div>
        </div>

        {patterns.filter(p => p.alertTriggered).length > 0 && (
          <div className="insight-card alert-card">
            <div className="alert-icon">⚠️</div>
            <h3>Repeat Pattern Detected</h3>
            <p>3 similar incidents reported in Engineering department within 2 weeks</p>
            <button className="btn-secondary">View Details (ICC Only)</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default PatternDetection;
