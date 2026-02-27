import React, { useState, useEffect } from 'react';
import encryptionService from '../services/encryption';
import apiService from '../services/api';

function ReportForm() {
  const [formData, setFormData] = useState({
    incidentType: '',
    incidentDate: '',
    department: '',
    description: ''
  });

  const [selectedAuthorities, setSelectedAuthorities] = useState(['icc', 'ngo']);
  const [authorities, setAuthorities] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [encryptionStep, setEncryptionStep] = useState(0);

  useEffect(() => {
    // Fetch authorities from API
    apiService.listAuthorities()
      .then(data => setAuthorities(data))
      .catch(err => console.error('Failed to load authorities:', err));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthorityToggle = (authorityId) => {
    setSelectedAuthorities(prev => 
      prev.includes(authorityId)
        ? prev.filter(id => id !== authorityId)
        : [...prev, authorityId]
    );
  };

  const animateEncryptionSteps = () => {
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => setEncryptionStep(i), i * 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedAuthorities.length === 0) {
      alert('Please select at least one authority to receive this report.');
      return;
    }

    setIsSubmitting(true);
    animateEncryptionSteps();

    try {
      // Get selected authority objects
      const selectedAuthorityObjects = authorities
        .filter(auth => selectedAuthorities.includes(auth.type));

      // Encrypt complaint data
      const encryptedPayload = await encryptionService.encryptComplaint(
        formData,
        selectedAuthorityObjects.map(auth => ({
          id: auth.id,
          publicKey: auth.publicKey
        }))
      );

      // Submit to backend API
      const response = await apiService.submitComplaint(encryptedPayload);

      setReferenceCode(response.referenceCode);
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        incidentType: '',
        incidentDate: '',
        department: '',
        description: ''
      });
      setEncryptionStep(0);

    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred during encryption. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="report" className="report-section">
      <div className="section-header">
        <h2>Submit Anonymous Report</h2>
        <p>All data is encrypted in your browser before transmission. We never see your information.</p>
      </div>

      <div className="encryption-status">
        <div className="status-badge">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2L3 5V10C3 14 6 17 10 18C14 17 17 14 17 10V5L10 2Z"/>
          </svg>
          <span>Client-Side Encryption Active</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        {/* Incident Details */}
        <div className="form-section">
          <h3>Incident Details</h3>
          
          <div className="form-group">
            <label htmlFor="incidentType">Type of Incident</label>
            <select 
              id="incidentType" 
              name="incidentType"
              value={formData.incidentType}
              onChange={handleInputChange}
              required
            >
              <option value="">Select incident type</option>
              <option value="verbal">Verbal Harassment</option>
              <option value="physical">Physical Harassment</option>
              <option value="sexual">Sexual Harassment</option>
              <option value="discrimination">Discrimination</option>
              <option value="bullying">Workplace Bullying</option>
              <option value="retaliation">Retaliation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="incidentDate">Date of Incident</label>
            <input 
              type="date" 
              id="incidentDate" 
              name="incidentDate"
              value={formData.incidentDate}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department (Optional - Anonymized)</label>
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
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description of Incident</label>
            <textarea 
              id="description" 
              name="description"
              rows="6" 
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Please describe what happened in as much detail as you're comfortable sharing..."
              required
            />
            <small>This will be encrypted before leaving your browser</small>
          </div>
        </div>

        {/* Authority Selection */}
        <div className="form-section">
          <h3>Select Reporting Authorities</h3>
          <p className="section-note">Choose who can access this complaint. You control who sees your report.</p>
          
          <div className="authority-grid">
            {authorities.map(authority => (
              <label 
                key={authority.id}
                className={`authority-card ${selectedAuthorities.includes(authority.type) ? 'selected' : ''} ${authority.type === 'icc' || authority.type === 'ngo' ? 'recommended' : ''}`}
              >
                <input 
                  type="checkbox" 
                  checked={selectedAuthorities.includes(authority.type)}
                  onChange={() => handleAuthorityToggle(authority.type)}
                />
                <div className="card-content">
                  <div className="card-icon">
                    {authority.type === 'hr' && '🏢'}
                    {authority.type === 'icc' && '⚖️'}
                    {authority.type === 'ngo' && '🤝'}
                    {authority.type === 'legal' && '⚖️'}
                  </div>
                  <div className="card-title">{authority.name}</div>
                  <div className="card-desc">{authority.organization}</div>
                  {(authority.type === 'icc' || authority.type === 'ngo') && (
                    <div className="recommended-badge">Recommended</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="info-box">
            <strong>Note:</strong> If HR is involved in the harassment, you can bypass them entirely by not selecting them above.
          </div>
        </div>

        {/* Encryption Visualization */}
        <div className="encryption-visual">
          <div className={`encryption-step ${encryptionStep >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <strong>Generate Key</strong>
              <small>AES-256 symmetric key</small>
            </div>
          </div>
          <div className="arrow">→</div>
          <div className={`encryption-step ${encryptionStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <strong>Encrypt Data</strong>
              <small>In your browser</small>
            </div>
          </div>
          <div className="arrow">→</div>
          <div className={`encryption-step ${encryptionStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-content">
              <strong>Encrypt Keys</strong>
              <small>For selected authorities</small>
            </div>
          </div>
          <div className="arrow">→</div>
          <div className={`encryption-step ${encryptionStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-content">
              <strong>Secure Storage</strong>
              <small>Encrypted database</small>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 1L3 4V9C3 13 6 16 10 17C14 16 17 13 17 9V4L10 1Z"/>
          </svg>
          <span>{isSubmitting ? '🔐 Encrypting...' : 'Encrypt & Submit Report'}</span>
        </button>
      </form>

      {/* Success Modal */}
      {showSuccess && (
        <div className="modal" onClick={() => setShowSuccess(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h2>Report Submitted Successfully</h2>
            <p>Your complaint has been encrypted and securely stored. Selected authorities will be notified.</p>
            <div className="reference-code">
              <label>Your Reference Code:</label>
              <div className="code-display">{referenceCode}</div>
              <small>Save this code (optional) if you want to follow up anonymously</small>
            </div>
            <div className="encryption-details">
              <h4>Encryption Details:</h4>
              <ul>
                <li>✓ Data encrypted with AES-256-GCM</li>
                <li>✓ Unique encryption key generated</li>
                <li>✓ Key encrypted for {selectedAuthorities.length} authorities</li>
                <li>✓ Zero plaintext storage</li>
              </ul>
            </div>
            <button className="btn-primary" onClick={() => setShowSuccess(false)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReportForm;
