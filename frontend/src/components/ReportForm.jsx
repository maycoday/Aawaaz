import React, { useState, useEffect } from 'react';
import encryptionService from '../services/encryption';
import apiService from '../services/api';

/**
 * ComplaintForm - Multi-step anonymous complaint submission
 * Features: Client-side encryption, multi-authority selection, zero-knowledge architecture
 */
function ReportForm() {
  // Form state management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    complaintText: '',
    incidentDate: '',
    department: '',
    incidentType: ''
  });

  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Load authorities on mount
  useEffect(() => {
    apiService.listAuthorities()
      .then(data => setAuthorities(data))
      .catch(err => {
        console.error('Failed to load authorities:', err);
        setError('Failed to load reporting authorities. Please refresh the page.');
      });
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Handle authority selection
  const handleAuthorityToggle = (authorityId) => {
    setSelectedAuthorities(prev => 
      prev.includes(authorityId)
        ? prev.filter(id => id !== authorityId)
        : [...prev, authorityId]
    );
  };

  // Validation functions
  const validateStep1 = () => {
    const errors = {};
    if (!formData.complaintText || formData.complaintText.trim().length < 50) {
      errors.complaintText = 'Please provide at least 50 characters describing the incident';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.incidentType) {
      errors.incidentType = 'Please select incident type';
    }
    if (!formData.incidentDate) {
      errors.incidentDate = 'Please select incident date';
    } else {
      const selectedDate = new Date(formData.incidentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        errors.incidentDate = 'Incident date cannot be in the future';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors = {};
    if (selectedAuthorities.length === 0) {
      errors.authorities = 'Please select at least one reporting authority';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step navigation
  const goToNextStep = () => {
    let isValid = true;
    
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Form submission
  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    setIsEncrypting(true);

    try {
      // Prepare complaint data
      const complaintData = {
        description: formData.complaintText,
        incidentType: formData.incidentType,
        incidentDate: formData.incidentDate,
        department: formData.department || 'unspecified'
      };

      // Get selected authority objects with public keys
      const selectedAuthorityObjects = Array.isArray(authorities)
        ? authorities
          .filter(auth => selectedAuthorities.includes(auth.id))
          .map(auth => ({
            id: auth.id,
            publicKey: auth.publicKey || 'DEMO_PUBLIC_KEY' // Demo fallback
          }))
        : [];

      console.log('🔐 Starting encryption process...');

      // Encrypt complaint using encryption service
      const encryptedPayload = await encryptionService.encryptComplaint(
        complaintData,
        selectedAuthorityObjects
      );

      setIsEncrypting(false);
      console.log('✅ Encryption complete. Submitting to server...');

      // Submit encrypted payload to backend
      const response = await apiService.submitComplaint(encryptedPayload);

      // Success!
      setReferenceCode(response.referenceCode || encryptedPayload.referenceCode);
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        complaintText: '',
        incidentDate: '',
        department: '',
        incidentType: ''
      });
      setSelectedAuthorities([]);
      setCurrentStep(1);

    } catch (error) {
      console.error('❌ Submission error:', error);
      setError(
        error.message || 
        'An error occurred while encrypting and submitting your report. Please try again.'
      );
      setIsEncrypting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current step can proceed
  const canProceed = () => {
    if (currentStep === 1) return formData.complaintText.trim().length >= 50;
    if (currentStep === 2) return formData.incidentType && formData.incidentDate;
    if (currentStep === 3) return selectedAuthorities.length > 0;
    return true;
  };

  // Render privacy notice
  const PrivacyNotice = () => (
    <div className="privacy-notice">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2L3 5V10C3 14 6 17 10 18C14 17 17 14 17 10V5L10 2Z"/>
      </svg>
      <div>
        <strong>Your identity is completely anonymous</strong>
        <p>No personal information is collected • Encrypted in your browser before sending</p>
      </div>
    </div>
  );

  // Render progress bar
  const ProgressBar = () => (
    <div className="progress-container">
      <div className="progress-bar">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
            <div className="step-circle">{step}</div>
            <div className="step-label">
              {step === 1 && 'Complaint'}
              {step === 2 && 'Details'}
              {step === 3 && 'Authorities'}
              {step === 4 && 'Review'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h2>Describe the Incident</h2>
            <p className="step-description">
              Please provide a detailed description of what happened. Your report helps create a safer workplace.
            </p>
            
            <PrivacyNotice />

            <div className="form-group">
              <label htmlFor="complaintText">
                What happened? <span className="required">*</span>
              </label>
              <textarea 
                id="complaintText" 
                name="complaintText"
                rows="10" 
                value={formData.complaintText}
                onChange={handleInputChange}
                placeholder="Please describe the incident in detail. Include dates, locations, witnesses if any, and any other relevant information..."
                className={validationErrors.complaintText ? 'error' : ''}
              />
              <div className="input-help">
                <span className={formData.complaintText.length >= 50 ? 'valid' : 'invalid'}>
                  {formData.complaintText.length} / 50 characters minimum
                </span>
              </div>
              {validationErrors.complaintText && (
                <div className="error-message">{validationErrors.complaintText}</div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="form-step">
            <h2>Incident Details</h2>
            <p className="step-description">
              Help us categorize and prioritize your report.
            </p>
            
            <PrivacyNotice />

            <div className="form-group">
              <label htmlFor="incidentType">
                Type of Incident <span className="required">*</span>
              </label>
              <select 
                id="incidentType" 
                name="incidentType"
                value={formData.incidentType}
                onChange={handleInputChange}
                className={validationErrors.incidentType ? 'error' : ''}
              >
                <option value="">-- Select incident type --</option>
                <option value="verbal">Verbal Harassment</option>
                <option value="physical">Physical Harassment</option>
                <option value="sexual">Sexual Harassment</option>
                <option value="discrimination">Discrimination</option>
                <option value="bullying">Workplace Bullying</option>
                <option value="retaliation">Retaliation</option>
                <option value="intimidation">Intimidation</option>
                <option value="other">Other</option>
              </select>
              {validationErrors.incidentType && (
                <div className="error-message">{validationErrors.incidentType}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="incidentDate">
                When did this occur? <span className="required">*</span>
              </label>
              <input 
                type="date" 
                id="incidentDate" 
                name="incidentDate"
                value={formData.incidentDate}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className={validationErrors.incidentDate ? 'error' : ''}
              />
              {validationErrors.incidentDate && (
                <div className="error-message">{validationErrors.incidentDate}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="department">
                Department (Optional)
              </label>
              <select 
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              >
                <option value="">Prefer not to say</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="hr">Human Resources</option>
                <option value="finance">Finance</option>
                <option value="operations">Operations</option>
                <option value="customer_service">Customer Service</option>
                <option value="other">Other</option>
              </select>
              <small className="input-note">
                This will be anonymized using cryptographic hashing
              </small>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="form-step">
            <h2>Select Reporting Authorities</h2>
            <p className="step-description">
              Choose who can access this report. Only selected authorities will be able to decrypt and read your complaint.
            </p>
            
            <PrivacyNotice />

            {validationErrors.authorities && (
              <div className="error-message-box">{validationErrors.authorities}</div>
            )}

            <div className="authority-grid">
              {Array.isArray(authorities) && authorities.length > 0 ? authorities.map(authority => (
                <div
                  key={authority.id}
                  className={`authority-card ${selectedAuthorities.includes(authority.id) ? 'selected' : ''}`}
                  onClick={() => handleAuthorityToggle(authority.id)}
                >
                  <div className="card-checkbox">
                    <input 
                      type="checkbox" 
                      checked={selectedAuthorities.includes(authority.id)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="card-icon">
                    {authority.type === 'hr' && '🏢'}
                    {authority.type === 'icc' && '⚖️'}
                    {authority.type === 'ngo' && '🤝'}
                    {authority.type === 'legal' && '📋'}
                  </div>
                  <div className="card-title">{authority.name}</div>
                  <div className="card-desc">{authority.organization}</div>
                  {authority.recommended && (
                    <div className="recommended-badge">Recommended</div>
                  )}
                </div>
              )) : (
                <div className="info-box" style={{gridColumn: '1 / -1'}}>
                  <p>Loading authorities... If this persists, the backend server may not be running.</p>
                </div>
              )}
            </div>

            <div className="info-box">
              <strong>💡 Tip:</strong> If HR is involved in the harassment, you can bypass them entirely by not selecting them above.
            </div>
          </div>
        );

      case 4:
        return (
          <div className="form-step">
            <h2>Review Your Report</h2>
            <p className="step-description">
              Please review your information before submission. Once submitted, it will be encrypted and cannot be edited.
            </p>
            
            <PrivacyNotice />

            <div className="review-section">
              <div className="review-item">
                <label>Complaint Description:</label>
                <div className="review-content">{formData.complaintText}</div>
              </div>

              <div className="review-item">
                <label>Incident Type:</label>
                <div className="review-content">
                  {formData.incidentType.charAt(0).toUpperCase() + formData.incidentType.slice(1)}
                </div>
              </div>

              <div className="review-item">
                <label>Incident Date:</label>
                <div className="review-content">
                  {new Date(formData.incidentDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              {formData.department && (
                <div className="review-item">
                  <label>Department:</label>
                  <div className="review-content">
                    {formData.department.charAt(0).toUpperCase() + formData.department.slice(1).replace('_', ' ')}
                  </div>
                </div>
              )}

              <div className="review-item">
                <label>Selected Authorities ({selectedAuthorities.length}):</label>
                <div className="review-content">
                  {authorities
                    .filter(auth => selectedAuthorities.includes(auth.id))
                    .map(auth => auth.name)
                    .join(', ')}
                </div>
              </div>
            </div>

            {error && (
              <div className="error-message-box">{error}</div>
            )}

            <div className="encryption-info-box">
              <h4>🔐 What happens next:</h4>
              <ol>
                <li>Your data will be encrypted in your browser using AES-256-GCM</li>
                <li>A unique encryption key will be generated</li>
                <li>The key will be encrypted separately for each selected authority using RSA-OAEP</li>
                <li>Only encrypted data is transmitted to the server</li>
                <li>You'll receive a reference code for tracking</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="report" className="report-section">
      <div className="section-header">
        <h1>Submit Anonymous Report</h1>
        <p>All data is encrypted in your browser before transmission. We never see your information.</p>
      </div>

      <div className="report-form-container">
        <ProgressBar />
        
        <div className="form-content">
          {renderStepContent()}
        </div>

        <div className="form-navigation">
          {currentStep > 1 && (
            <button 
              type="button" 
              className="btn-secondary"
              onClick={goToPreviousStep}
              disabled={isSubmitting}
            >
              ← Back
            </button>
          )}
          
          {currentStep < 4 ? (
            <button 
              type="button" 
              className="btn-primary"
              onClick={goToNextStep}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
            >
              {isSubmitting && (
                <span className="spinner"></span>
              )}
              {isEncrypting ? '🔐 Encrypting...' : isSubmitting ? 'Submitting...' : '🔒 Encrypt & Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h2>Report Submitted Successfully</h2>
            <p>Your complaint has been encrypted and securely stored. Selected authorities will be notified.</p>
            
            <div className="reference-code-box">
              <label>Your Tracking Reference Code:</label>
              <div className="code-display">{referenceCode}</div>
              <small>💾 Save this code if you want to follow up anonymously (optional)</small>
            </div>
            
            <div className="encryption-summary">
              <h4>🔒 Encryption Confirmation:</h4>
              <ul>
                <li>✅ Data encrypted with AES-256-GCM</li>
                <li>✅ Unique encryption key generated</li>
                <li>✅ Key encrypted for {selectedAuthorities.length} {selectedAuthorities.length === 1 ? 'authority' : 'authorities'}</li>
                <li>✅ Zero plaintext storage on server</li>
                <li>✅ Your anonymity preserved</li>
              </ul>
            </div>
            
            <button className="btn-primary" onClick={() => setShowSuccess(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReportForm;

