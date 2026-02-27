import React, { useState, useEffect } from 'react';
import './AuthoritySelector.css';
import apiService from '../services/api';

/**
 * AuthoritySelector - Select authorities who will receive encrypted complaints
 * Features: Multi-select, visual feedback, HR bypass warning, responsive grid
 * 
 * @param {Array} selectedAuthorities - Currently selected authority IDs
 * @param {Function} onSelect - Callback when selection changes
 * @param {Function} onNext - Callback for next step
 * @param {Function} onBack - Callback for previous step
 */
function AuthoritySelector({ selectedAuthorities = [], onSelect, onNext, onBack }) {
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch authorities from API on mount
  useEffect(() => {
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    try {
      setLoading(true);
      const result = await apiService.fetchAuthorities();
      
      if (result.success) {
        // Map API response to component format with icons
        const mappedAuthorities = result.authorities.map(auth => ({
          ...auth,
          icon: getAuthorityIcon(auth.type),
          warning: auth.type === 'HR',
          recommended: auth.type === 'ICC' || auth.type === 'NGO'
        }));
        setAuthorities(mappedAuthorities);
        setError(null);
      } else {
        setError(result.error || 'Failed to load authorities');
      }
    } catch (err) {
      console.error('❌ Failed to fetch authorities:', err);
      setError('Unable to load authorities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get icon for authority type
  const getAuthorityIcon = (type) => {
    const icons = {
      'HR': '🏢',
      'ICC': '⚖️',
      'NGO': '🤝',
      'LEGAL': '📋',
      'Legal': '📋'
    };
    return icons[type] || '👥';
  };

  // Check if authority is selected
  const isSelected = (authorityId) => {
    return selectedAuthorities.includes(authorityId);
  };

  // Toggle authority selection
  const handleToggle = (authority) => {
    let newSelection;
    if (isSelected(authority.id)) {
      // Deselect
      newSelection = selectedAuthorities.filter(id => id !== authority.id);
    } else {
      // Select
      newSelection = [...selectedAuthorities, authority.id];
    }
    onSelect(newSelection);
  };

  // Get selected authority objects
  const getSelectedAuthorities = () => {
    return authorities.filter(auth => selectedAuthorities.includes(auth.id));
  };

  // Check if can proceed
  const canProceed = selectedAuthorities.length > 0;

  // Loading state
  if (loading) {
    return (
      <div className="authority-selector">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading authorities...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="authority-selector">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button onClick={fetchAuthorities} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No authorities found
  if (authorities.length === 0) {
    return (
      <div className="authority-selector">
        <div className="empty-state">
          <p>No authorities available at the moment.</p>
          <button onClick={fetchAuthorities} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="authority-selector">
      <div className="selector-header">
        <h2>Select Reporting Authorities</h2>
        <p className="subtitle">
          Choose who can access this encrypted report. Only selected authorities will be able to decrypt and view your complaint.
        </p>
        {selectedAuthorities.length > 0 && (
          <div className="selection-count">
            <span className="count-badge">{selectedAuthorities.length}</span>
            <span className="count-text">
              {selectedAuthorities.length === 1 ? 'authority' : 'authorities'} selected
            </span>
          </div>
        )}
      </div>

      <div className="hr-warning-banner">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <strong>Important:</strong> You can bypass HR entirely if they are part of the problem. 
          Only select HR if you trust them to handle your complaint fairly.
        </div>
      </div>

      <div className="authority-grid">
        {authorities.map((authority) => (
          <div
            key={authority.id}
            className={`authority-card ${isSelected(authority.id) ? 'selected' : ''} ${authority.warning ? 'has-warning' : ''}`}
            onClick={() => handleToggle(authority)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle(authority);
              }
            }}
          >
            {/* Selection Indicator */}
            <div className="card-checkbox">
              <div className={`checkbox ${isSelected(authority.id) ? 'checked' : ''}`}>
                {isSelected(authority.id) && <span className="checkmark">✓</span>}
              </div>
            </div>

            {/* Authority Icon */}
            <div className="authority-icon">{authority.icon}</div>

            {/* Authority Info */}
            <div className="authority-info">
              <h3 className="authority-name">{authority.name}</h3>
              
              {/* Type Badge */}
              <div className="badge-container">
                <span className={`type-badge badge-${authority.type.toLowerCase()}`}>
                  {authority.type}
                </span>
                {authority.recommended && (
                  <span className="recommended-badge">Recommended</span>
                )}
              </div>
              
              {/* Description */}
              <p className="authority-description">{authority.description}</p>

              {/* HR Warning */}
              {authority.warning && (
                <div className="card-warning">
                  <small>⚠️ Select only if you trust HR</small>
                </div>
              )}
            </div>

            {/* Selected Overlay */}
            {isSelected(authority.id) && (
              <div className="selected-overlay">
                <div className="selected-badge">✓ Selected</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedAuthorities.length > 0 && (
        <div className="selection-summary">
          <h4>Your report will be accessible to:</h4>
          <ul className="selected-list">
            {getSelectedAuthorities().map((auth) => (
              <li key={auth.id}>
                <span className="list-icon">{auth.icon}</span>
                <span className="list-name">{auth.name}</span>
                <span className={`list-badge badge-${auth.type.toLowerCase()}`}>
                  {auth.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Encryption Info */}
      <div className="encryption-info">
        <div className="info-icon">🔐</div>
        <div className="info-content">
          <strong>How it works:</strong> Your complaint will be encrypted with a unique key. 
          This key will then be separately encrypted for each selected authority using their public key. 
          Only they can decrypt and read your report.
        </div>
      </div>

      {/* Validation Message */}
      {!canProceed && (
        <div className="validation-message">
          <span className="validation-icon">ℹ️</span>
          Please select at least one authority to receive your encrypted report
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="selector-navigation">
        {onBack && (
          <button 
            type="button" 
            className="btn-back"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
        
        {onNext && (
          <button 
            type="button" 
            className="btn-next"
            onClick={onNext}
            disabled={!canProceed}
          >
            Next: Review & Submit →
          </button>
        )}
      </div>
    </div>
  );
}

export default AuthoritySelector;
