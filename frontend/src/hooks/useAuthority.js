import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

/**
 * useAuthority Hook
 * 
 * Custom hook for managing authority authentication and session.
 * Handles login/logout, token management, and complaint list fetching.
 * 
 * @returns {Object} Authority authentication utilities and state
 * @returns {Function} login - Authenticates authority user
 * @returns {Function} logout - Logs out authority and clears session
 * @returns {Function} fetchComplaints - Retrieves complaints for authority
 * @returns {boolean} isAuthenticated - True if authority is logged in
 * @returns {Object|null} authority - Current authority user data
 * @returns {Array} complaints - List of complaints assigned to authority
 * @returns {boolean} isLoading - Loading state for async operations
 * @returns {string|null} error - Error message if operation fails
 * 
 * @example
 * const { login, logout, isAuthenticated, authority, complaints } = useAuthority();
 * 
 * const handleLogin = async () => {
 *   const result = await login({
 *     identifier: 'auth-hr-001',
 *     password: 'password123'
 *   });
 *   
 *   if (result.success) {
 *     console.log('Logged in as:', authority.name);
 *   }
 * };
 */
export const useAuthority = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authority, setAuthority] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Check authentication status on mount
   * Restores session if valid token exists
   */
  useEffect(() => {
    const checkAuth = () => {
      const token = apiService.getToken();
      
      if (token) {
        // Token exists - try to restore session
        const storedAuthority = localStorage.getItem('authority_user');
        
        if (storedAuthority) {
          try {
            const authorityData = JSON.parse(storedAuthority);
            setAuthority(authorityData);
            setIsAuthenticated(true);
            console.log('✅ Session restored for:', authorityData.name);
          } catch (err) {
            console.error('❌ Failed to restore session:', err);
            // Clear invalid data
            logout();
          }
        }
      }
    };

    checkAuth();
  }, []);

  /**
   * Login authority user
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.identifier - Authority ID or email
   * @param {string} credentials.password - Authority password
   * @returns {Promise<Object>} Result with success status
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate credentials
      if (!credentials?.identifier || !credentials?.password) {
        throw new Error('Identifier and password are required');
      }

      // Call API service
      const result = await apiService.authorityLogin(credentials);

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // Store authority data
      const authorityData = result.authority;
      setAuthority(authorityData);
      setIsAuthenticated(true);

      // Persist to localStorage (for session restoration)
      localStorage.setItem('authority_user', JSON.stringify(authorityData));

      console.log('✅ Login successful:', authorityData.name);
      setIsLoading(false);

      return {
        success: true,
        authority: authorityData,
      };

    } catch (err) {
      console.error('❌ Login error:', err);
      const errorMessage = err.message || 'Login failed. Check your credentials.';
      setError(errorMessage);
      setIsLoading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  /**
   * Logout authority user
   * Clears session, token, and local storage
   */
  const logout = useCallback(() => {
    // Clear API token
    apiService.clearToken();

    // Clear local storage
    localStorage.removeItem('authority_user');

    // Reset state
    setAuthority(null);
    setIsAuthenticated(false);
    setComplaints([]);
    setError(null);

    console.log('👋 Logged out successfully');
  }, []);

  /**
   * Fetch complaints assigned to current authority
   * 
   * @param {Object} options - Fetch options
   * @param {string} options.status - Filter by status (pending, under_review, resolved)
   * @param {number} options.page - Page number for pagination
   * @param {number} options.limit - Results per page
   * @returns {Promise<Object>} Result with complaints data
   */
  const fetchComplaints = useCallback(async (options = {}) => {
    if (!authority) {
      const error = 'No authority logged in';
      setError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.getAuthorityComplaints({
        authorityId: authority.id,
        status: options.status,
        page: options.page || 1,
        limit: options.limit || 20,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch complaints');
      }

      setComplaints(result.complaints || []);
      setIsLoading(false);

      return {
        success: true,
        complaints: result.complaints || [],
        total: result.total || 0,
        page: result.page || 1,
      };

    } catch (err) {
      console.error('❌ Error fetching complaints:', err);
      const errorMessage = err.message || 'Failed to fetch complaints';
      setError(errorMessage);
      setIsLoading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [authority]);

  /**
   * Update complaint status
   * 
   * @param {string} complaintId - Complaint ID to update
   * @param {string} status - New status (pending, under_review, escalated, resolved)
   * @returns {Promise<Object>} Result with success status
   */
  const updateComplaintStatus = useCallback(async (complaintId, status) => {
    if (!authority) {
      const error = 'No authority logged in';
      setError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.updateAuthorityComplaintStatus({
        authorityId: authority.id,
        complaintId,
        status,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // Update local state
      setComplaints(prev => prev.map(c => 
        c.id === complaintId ? { ...c, status } : c
      ));

      setIsLoading(false);

      return { success: true };

    } catch (err) {
      console.error('❌ Error updating status:', err);
      const errorMessage = err.message || 'Failed to update complaint status';
      setError(errorMessage);
      setIsLoading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [authority]);

  /**
   * Add note to complaint
   * 
   * @param {string} complaintId - Complaint ID
   * @param {string} note - Note text to add
   * @returns {Promise<Object>} Result with success status
   */
  const addComplaintNote = useCallback(async (complaintId, note) => {
    if (!authority) {
      const error = 'No authority logged in';
      setError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.addAuthorityComplaintNote({
        authorityId: authority.id,
        complaintId,
        note,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add note');
      }

      setIsLoading(false);

      return { success: true };

    } catch (err) {
      console.error('❌ Error adding note:', err);
      const errorMessage = err.message || 'Failed to add note';
      setError(errorMessage);
      setIsLoading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [authority]);

  return {
    login,
    logout,
    fetchComplaints,
    updateComplaintStatus,
    addComplaintNote,
    isAuthenticated,
    authority,
    complaints,
    isLoading,
    error,
  };
};
