import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import encryptionService from '../services/encryption';
import DecryptionModal from './DecryptionModal';
import '../styles/ComplaintDetail.css';

const ComplaintDetail = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { authority, refreshSession } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedData, setDecryptedData] = useState(null);
  const [showDecryptionModal, setShowDecryptionModal] = useState(false);
  
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchComplaintDetail();
    refreshSession();
  }, [complaintId]);

  const fetchComplaintDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getComplaintDetail(complaintId, authority.id);

      if (response.success) {
        setComplaint(response.complaint);
      } else {
        setError(response.message || 'Failed to fetch complaint details');
      }
    } catch (err) {
      console.error('Error fetching complaint:', err);
      setError('An error occurred while fetching complaint details');
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptSuccess = async (aesKey) => {
    try {
      // Decrypt the complaint payload
      const encryptedPayload = encryptionService.base64ToArrayBuffer(complaint.encrypted_payload);
      
      // Extract IV (first 12 bytes) and ciphertext
      const iv = encryptedPayload.slice(0, 12);
      const ciphertext = encryptedPayload.slice(12);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        aesKey,
        ciphertext
      );

      // Convert to string and parse JSON
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      const decryptedJSON = JSON.parse(decryptedText);

      setDecryptedData(decryptedJSON);
      setIsDecrypted(true);

      // Log the view action
      await apiService.logAuthorityAction({
        complaintId,
        authorityId: authority.id,
        actionType: 'viewed',
        notes: 'Decrypted and viewed complaint details'
      });
    } catch (err) {
      console.error('Error decrypting complaint:', err);
      alert('Failed to decrypt complaint. The data may be corrupted.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Change status to "${newStatus.replace('_', ' ')}"?`)) {
      return;
    }

    setUpdatingStatus(true);

    try {
      const response = await apiService.updateComplaintStatus({
        complaintId,
        authorityId: authority.id,
        status: newStatus
      });

      if (response.success) {
        setComplaint({ ...complaint, status: newStatus });
        
        // Log the action
        await apiService.logAuthorityAction({
          complaintId,
          authorityId: authority.id,
          actionType: 'updated_status',
          notes: `Changed status to ${newStatus}`
        });

        alert('Status updated successfully');
      } else {
        alert('Failed to update status: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('An error occurred while updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note');
      return;
    }

    setAddingNote(true);

    try {
      const response = await apiService.addComplaintNote({
        complaintId,
        authorityId: authority.id,
        note: newNote.trim()
      });

      if (response.success) {
        // Log the action
        await apiService.logAuthorityAction({
          complaintId,
          authorityId: authority.id,
          actionType: 'added_note',
          notes: newNote.trim()
        });

        setNewNote('');
        alert('Note added successfully');
      } else {
        alert('Failed to add note: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding note:', err);
      alert('An error occurred while adding note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDownload = async () => {
    if (!isDecrypted) {
      alert('Please decrypt the complaint first');
      return;
    }

    try {
      const dataStr = JSON.stringify({
        complaintId: complaint.id,
        submittedAt: complaint.created_at,
        status: complaint.status,
        metadata: complaint.metadata,
        decryptedContent: decryptedData
      }, null, 2);

      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `complaint-${complaint.id.substring(0, 8)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      // Log the action
      await apiService.logAuthorityAction({
        complaintId,
        authorityId: authority.id,
        actionType: 'downloaded',
        notes: 'Downloaded complaint data'
      });
    } catch (err) {
      console.error('Error downloading:', err);
      alert('Failed to download complaint data');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="complaint-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading complaint details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="complaint-detail-error">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <h2>Error Loading Complaint</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/authority/dashboard/complaints')} className="back-button">
          Back to Complaints
        </button>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  return (
    <div className="complaint-detail-container">
      {/* Header */}
      <header className="complaint-detail-header">
        <button onClick={() => navigate('/authority/dashboard/complaints')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to List
        </button>
        <div className="header-info">
          <h1>Complaint Details</h1>
          <code className="complaint-id-badge">{complaint.id}</code>
        </div>
        <div className="header-actions">
          {isDecrypted && (
            <button onClick={handleDownload} className="action-button secondary">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download
            </button>
          )}
        </div>
      </header>

      {/* Complaint Info */}
      <div className="complaint-detail-grid">
        {/* Left Column */}
        <div className="detail-column main-column">
          {/* Encrypted/Decrypted Content */}
          <div className="detail-card">
            <div className="card-header">
              <h2>
                {isDecrypted ? 'Decrypted Content' : 'Encrypted Content'}
              </h2>
              {!isDecrypted && (
                <button 
                  onClick={() => setShowDecryptionModal(true)}
                  className="decrypt-button"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Decrypt Complaint
                </button>
              )}
            </div>

            {!isDecrypted ? (
              <div className="encrypted-content">
                <div className="encryption-notice">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7V11C2 16.55 5.84 21.74 12 23C18.16 21.74 22 16.55 22 11V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <p>This complaint is encrypted. Click "Decrypt Complaint" to view the contents.</p>
                </div>
                <div className="encrypted-payload">
                  <label>Encrypted Payload (Base64):</label>
                  <textarea 
                    readOnly 
                    value={complaint.encrypted_payload?.substring(0, 500) + '...'}
                    rows="6"
                  />
                </div>
              </div>
            ) : (
              <div className="decrypted-content">
                <div className="decryption-success">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.76489 14.1003 1.98232 16.07 2.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Successfully decrypted
                </div>

                <div className="content-section">
                  <h3>Complaint Text</h3>
                  <div className="complaint-text">{decryptedData.complaintText}</div>
                </div>

                {decryptedData.incidentDate && (
                  <div className="content-section">
                    <h3>Incident Date</h3>
                    <p>{new Date(decryptedData.incidentDate).toLocaleDateString()}</p>
                  </div>
                )}

                {decryptedData.location && (
                  <div className="content-section">
                    <h3>Location</h3>
                    <p>{decryptedData.location}</p>
                  </div>
                )}

                {decryptedData.witnessInfo && (
                  <div className="content-section">
                    <h3>Witness Information</h3>
                    <p>{decryptedData.witnessInfo}</p>
                  </div>
                )}

                {decryptedData.evidence && decryptedData.evidence.length > 0 && (
                  <div className="content-section">
                    <h3>Evidence Files</h3>
                    <div className="evidence-list">
                      {decryptedData.evidence.map((file, idx) => (
                        <div key={idx} className="evidence-item">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M13 2V9H20" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status and Actions */}
          <div className="detail-card">
            <div className="card-header">
              <h2>Actions</h2>
            </div>

            <div className="status-actions">
              <label>Change Status:</label>
              <div className="status-buttons">
                <button
                  onClick={() => handleStatusChange('under_review')}
                  disabled={updatingStatus || complaint.status === 'under_review'}
                  className="status-action-btn reviewing"
                >
                  Mark as Reviewing
                </button>
                <button
                  onClick={() => handleStatusChange('escalated')}
                  disabled={updatingStatus || complaint.status === 'escalated'}
                  className="status-action-btn escalated"
                >
                  Escalate
                </button>
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updatingStatus || complaint.status === 'resolved'}
                  className="status-action-btn resolved"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>

            <div className="add-note-section">
              <label>Add Internal Note:</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a private note (visible only to authorities)..."
                rows="3"
                disabled={addingNote}
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="add-note-button"
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="detail-column sidebar-column">
          <div className="detail-card">
            <div className="card-header">
              <h2>Complaint Information</h2>
            </div>

            <div className="info-list">
              <div className="info-item">
                <label>Status</label>
                <span className={`status-badge ${complaint.status}`}>
                  {complaint.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="info-item">
                <label>Incident Type</label>
                <span>{complaint.metadata?.incidentType || 'N/A'}</span>
              </div>

              <div className="info-item">
                <label>Submitted</label>
                <span>{formatDate(complaint.created_at)}</span>
              </div>

              <div className="info-item">
                <label>Last Updated</label>
                <span>{formatDate(complaint.updated_at)}</span>
              </div>

              {complaint.metadata?.timestamp && (
                <div className="info-item">
                  <label>Incident Timestamp</label>
                  <span>{formatDate(complaint.metadata.timestamp)}</span>
                </div>
              )}

              {complaint.metadata?.hasEvidence !== undefined && (
                <div className="info-item">
                  <label>Has Evidence</label>
                  <span>{complaint.metadata.hasEvidence ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="card-header">
              <h2>Privacy Protection</h2>
            </div>
            <div className="privacy-info">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V11C2 16.55 5.84 21.74 12 23C18.16 21.74 22 16.55 22 11V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p>
                This complaint uses end-to-end encryption. The server never has access to the decrypted content.
                All decryption happens locally in your browser.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decryption Modal */}
      <DecryptionModal
        isOpen={showDecryptionModal}
        onClose={() => setShowDecryptionModal(false)}
        encryptedKey={complaint.encrypted_key_for_authority}
        onDecryptSuccess={handleDecryptSuccess}
      />
    </div>
  );
};

export default ComplaintDetail;
