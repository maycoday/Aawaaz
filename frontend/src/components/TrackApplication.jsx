import React, { useState } from 'react';
import apiService from '../services/api';

function TrackApplication() {
  const [referenceCode, setReferenceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const normalizeCode = (value) => value.replace(/\s+/g, '').toUpperCase();

  const formatStatus = (status) => {
    const map = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      escalated: 'Escalated',
      resolved: 'Resolved',
      archived: 'Archived',
    };
    return map[status] || 'In Progress';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    const trimmed = normalizeCode(referenceCode);
    if (!trimmed) {
      setError('Please enter your tracking reference code.');
      return;
    }

    setIsLoading(true);
    const response = await apiService.trackComplaint(trimmed);
    setIsLoading(false);

    if (!response.success) {
      setError(response.error || 'Unable to find your application.');
      return;
    }

    setResult({
      referenceCode: response.referenceCode || trimmed,
      status: response.status,
      submittedAt: response.submittedAt,
      incidentType: response.incidentType,
    });
  };

  return (
    <section id="track" className="track-section">
      <div className="section-header">
        <h2>Track Your Application</h2>
        <p>Use your reference code to check the current status of your report.</p>
      </div>

      <div className="track-card">
        <form className="track-form" onSubmit={handleSubmit}>
          <div className="track-input-group">
            <label htmlFor="referenceCode">Reference Code</label>
            <input
              id="referenceCode"
              type="text"
              placeholder="ABCD-1234-EFGH"
              value={referenceCode}
              onChange={(event) => setReferenceCode(normalizeCode(event.target.value))}
              autoComplete="off"
            />
            <small>Example: ABCD-1234-EFGH</small>
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {error && <div className="track-error">{error}</div>}

        {result && (
          <div className="track-result">
            <div className="track-row">
              <span className="track-label">Reference Code</span>
              <span className="track-value">{result.referenceCode}</span>
            </div>
            <div className="track-row">
              <span className="track-label">Status</span>
              <span className="track-value status-pill">{formatStatus(result.status)}</span>
            </div>
            <div className="track-row">
              <span className="track-label">Incident Type</span>
              <span className="track-value">{result.incidentType}</span>
            </div>
            <div className="track-row">
              <span className="track-label">Submitted At</span>
              <span className="track-value">{new Date(result.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default TrackApplication;
