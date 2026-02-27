import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import '../styles/ComplaintList.css';

const ComplaintList = () => {
  const { authority, refreshSession } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  
  const itemsPerPage = 20;

  useEffect(() => {
    fetchComplaints();
    refreshSession(); // Refresh session on activity
  }, [statusFilter, currentPage]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getAuthorityComplaints({
        authorityId: authority.id,
        status: statusFilter === 'all' ? null : statusFilter,
        page: currentPage,
        limit: itemsPerPage
      });

      if (response.success) {
        setComplaints(response.complaints || []);
        setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
      } else {
        setError(response.message || 'Failed to fetch complaints');
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('An error occurred while fetching complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const filteredComplaints = complaints.filter(complaint => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      complaint.id?.toLowerCase().includes(query) ||
      complaint.metadata?.incidentType?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'under_review': 'status-reviewing',
      'escalated': 'status-escalated',
      'resolved': 'status-resolved',
      'archived': 'status-archived'
    };
    return statusMap[status] || 'status-default';
  };

  const getIncidentTypeIcon = (type) => {
    const icons = {
      'verbal': '💬',
      'sexual': '🚫',
      'physical': '✋',
      'discrimination': '⚖️',
      'bullying': '😠',
      'retaliation': '↩️',
      'intimidation': '⚠️',
      'other': '📝'
    };
    return icons[type] || '📝';
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="complaint-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="complaint-list-container">
      <header className="complaint-list-header">
        <div>
          <h1>Complaint Management</h1>
          <p>Viewing complaints assigned to {authority?.name}</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchComplaints} className="refresh-button" disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.5 2V8M21.5 8H15.5M21.5 8L18 4.5C16.7429 3.24286 15.1767 2.35365 13.4607 1.93077C11.7446 1.5079 9.94542 1.56764 8.26119 2.10381C6.57696 2.63998 5.07397 3.63521 3.91677 4.97578C2.75956 6.31635 1.99433 7.95006 1.70415 9.69736" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2.5 22V16M2.5 16H8.5M2.5 16L6 19.5C7.25714 20.7571 8.82332 21.6464 10.5393 22.0692C12.2554 22.4921 14.0546 22.4324 15.7388 21.8962C17.423 21.36 18.926 20.3648 20.0832 19.0242C21.2404 17.6837 22.0057 16.0499 22.2958 14.3026" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="complaint-list-controls">
        <div className="control-left">
          <div className="status-filters">
            <button
              className={statusFilter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={statusFilter === 'pending' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={statusFilter === 'under_review' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setStatusFilter('under_review')}
            >
              Reviewing
            </button>
            <button
              className={statusFilter === 'resolved' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved
            </button>
          </div>

          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by ID or type..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="control-right">
          <div className="view-toggle">
            <button
              className={viewMode === 'table' ? 'view-btn active' : 'view-btn'}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="4" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="10" width="18" height="4" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="17" width="18" height="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button
              className={viewMode === 'card' ? 'view-btn active' : 'view-btn'}
              onClick={() => setViewMode('card')}
              title="Card view"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="complaint-list-error">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
          {error}
        </div>
      )}

      {/* Complaint List */}
      {filteredComplaints.length === 0 ? (
        <div className="complaint-list-empty">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>No complaints found</h3>
          <p>There are no complaints matching your filters.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="complaint-table-container">
          <table className="complaint-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map(complaint => (
                <tr key={complaint.id}>
                  <td className="complaint-id">
                    <code>{complaint.id.substring(0, 12)}...</code>
                  </td>
                  <td className="complaint-type">
                    <span className="type-badge">
                      {getIncidentTypeIcon(complaint.metadata?.incidentType)}
                      {complaint.metadata?.incidentType || 'Unknown'}
                    </span>
                  </td>
                  <td className="complaint-date">
                    {formatDate(complaint.created_at)}
                  </td>
                  <td className="complaint-status">
                    <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                      {complaint.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="complaint-actions">
                    <Link to={`/authority/dashboard/complaints/${complaint.id}`} className="action-btn view">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="complaint-cards-grid">
          {filteredComplaints.map(complaint => (
            <div key={complaint.id} className="complaint-card">
              <div className="card-header">
                <span className="card-icon">
                  {getIncidentTypeIcon(complaint.metadata?.incidentType)}
                </span>
                <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                  {complaint.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="card-body">
                <h3>{complaint.metadata?.incidentType || 'Unknown Type'}</h3>
                <div className="card-meta">
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {formatDate(complaint.created_at)}
                  </div>
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 8H17M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <code>{complaint.id.substring(0, 12)}...</code>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <Link to={`/authority/dashboard/complaints/${complaint.id}`} className="card-action-btn">
                  View Details
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ComplaintList;
