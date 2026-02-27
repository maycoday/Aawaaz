import axios from 'axios';

// ============================================
// API SERVICE CONFIGURATION
// ============================================

// Base URL from environment variable (Vite uses VITE_ prefix)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Check if running in development mode
const isDevelopment = import.meta.env.MODE === 'development';

// ============================================
// API SERVICE CLASS
// ============================================

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 30000; // 30 seconds

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  // ============================================
  // REQUEST INTERCEPTOR
  // ============================================

  setupRequestInterceptor() {
    this.client.interceptors.request.use(
      (config) => {
        // Automatically inject JWT token for authenticated requests
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development mode
        if (isDevelopment) {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          if (config.data) {
            console.log('📦 Request Data:', config.data);
          }
        }

        return config;
      },
      (error) => {
        if (isDevelopment) {
          console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // RESPONSE INTERCEPTOR
  // ============================================

  setupResponseInterceptor() {
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (isDevelopment) {
          console.log(`✅ API Response: ${response.status}`, response.data);
        }
        return response;
      },
      (error) => {
        // Global error handling
        if (isDevelopment) {
          console.error('❌ API Error:', error.response?.data || error.message);
        }

        // Handle specific error codes
        if (error.response) {
          const { status, data } = error.response;

          switch (status) {
            case 401:
              // Unauthorized - only redirect if an authority session exists
              if (this.getToken()) {
                this.handleUnauthorized();
              }
              break;
            case 403:
              console.error('🚫 Access Forbidden:', data?.message || 'You do not have permission');
              break;
            case 404:
              console.error('🔍 Not Found:', data?.message || 'Resource not found');
              break;
            case 500:
              console.error('🔥 Server Error:', data?.message || 'Internal server error');
              break;
            default:
              console.error(`⚠️  Error ${status}:`, data?.message || 'Unknown error');
          }
        } else if (error.request) {
          // Network error - no response received
          console.error('🌐 Network Error: No response from server. Check your connection.');
        } else {
          // Request setup error
          console.error('⚠️  Request Error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  getToken() {
    return localStorage.getItem('authority_token');
  }

  setToken(token) {
    localStorage.setItem('authority_token', token);
  }

  clearToken() {
    localStorage.removeItem('authority_token');
  }

  handleUnauthorized() {
    // Clear token
    this.clearToken();

    // Redirect to login page
    if (window.location.pathname !== '/authority/login') {
      console.warn('🔐 Session expired. Redirecting to login...');
      window.location.href = '/authority/login';
    }
  }

  // ============================================
  // COMPLAINT ENDPOINTS
  // ============================================

  /**
   * Submit an encrypted complaint
   * POST /api/v1/complaints/submit
   */
  async submitComplaint(encryptedData) {
    try {
      const response = await this.client.post('/complaints/submit', encryptedData);
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to submit complaint',
      };
    }
  }

  /**
   * Get complaint by ID
   * GET /api/v1/complaints/:id
   */
  async getComplaint(id) {
    try {
      const response = await this.client.get(`/complaints/${id}`);
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch complaint',
      };
    }
  }

  /**
   * Track complaint by reference code
   * GET /api/v1/complaints/track?reference=CODE
   */
  async trackComplaint(referenceCode) {
    try {
      const response = await this.client.get('/complaints/track', {
        params: { reference: referenceCode },
      });
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to track complaint',
      };
    }
  }

  /**
   * Get list of complaints (authenticated)
   * GET /api/v1/complaints
   */
  async getComplaintList(token = null) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await this.client.get('/complaints', { headers });
      return {
        success: true,
        complaints: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch complaints',
      };
    }
  }

  /**
   * Get complaint details (authenticated)
   * GET /api/v1/complaints/:id
   */
  async getComplaintDetail(id, token = null) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await this.client.get(`/complaints/${id}`, { headers });
      return {
        success: true,
        complaint: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch complaint details',
      };
    }
  }

  /**
   * Update complaint status (authenticated)
   * PUT /api/v1/complaints/:id/status
   */
  async updateComplaintStatus(id, status, token = null) {
    if (typeof id === 'object' && id !== null) {
      const payload = id;
      return this.updateComplaintStatus(payload.complaintId, payload.status, payload.authorityId || null);
    }
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await this.client.put(`/complaints/${id}/status`, { status }, { headers });
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update complaint status',
      };
    }
  }

  /**
   * Add authority note to complaint (authenticated)
   * POST /api/v1/complaints/:id/notes
   */
  async addAuthorityNote(id, note, token = null) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await this.client.post(`/complaints/${id}/notes`, { note }, { headers });
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to add note',
      };
    }
  }

  /**
   * Backward-compatible alias
   */
  async addComplaintNote({ complaintId, note, authorityId }) {
    return this.addAuthorityNote(complaintId, note, authorityId || null);
  }

  // ============================================
  // AUTHORITY ENDPOINTS
  // ============================================

  /**
   * Fetch all authorities
   * GET /api/v1/authorities
   */
  async fetchAuthorities() {
    try {
      const response = await this.client.get('/authorities');
      return {
        success: true,
        authorities: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch authorities',
      };
    }
  }

  /**
   * List all authorities (alias for fetchAuthorities)
   * GET /api/v1/authorities
   */
  async listAuthorities() {
    try {
      const response = await this.client.get('/authorities');
      return response.data; // Return direct array for compatibility
    } catch (error) {
      console.error('Failed to load authorities:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get authority by ID
   * GET /api/v1/authorities/:id
   */
  async getAuthority(id) {
    try {
      const response = await this.client.get(`/authorities/${id}`);
      return {
        success: true,
        authority: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch authority',
      };
    }
  }

  /**
   * Authority login
   * POST /api/v1/authority/login
   */
  async authorityLogin(credentials) {
    try {
      const response = await this.client.post('/authority/login', credentials);
      
      // Store token if login successful
      if (response.data.token) {
        this.setToken(response.data.token);
      }

      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed. Check your credentials.',
      };
    }
  }

  /**
   * Authority logout (clears token)
   */
  authorityLogout() {
    this.clearToken();
    return { success: true };
  }

  // ============================================
  // AUTHORITY COMPLAINT MANAGEMENT
  // ============================================

  /**
   * Get complaints for authority
   * GET /api/v1/authority/:authorityId/complaints
   */
  async getAuthorityComplaints({ authorityId, status, page = 1, limit = 20 }) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page);
      params.append('limit', limit);

      const response = await this.client.get(`/authority/${authorityId}/complaints?${params}`);
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch authority complaints',
      };
    }
  }

  /**
   * Get detailed complaint for authority
   * GET /api/v1/authority/:authorityId/complaints/:complaintId
   */
  async getAuthorityComplaintDetail(authorityId, complaintId) {
    try {
      const response = await this.client.get(`/authority/${authorityId}/complaints/${complaintId}`);
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch complaint details',
      };
    }
  }

  /**
   * Update complaint status by authority
   * PATCH /api/v1/authority/:authorityId/complaints/:complaintId/status
   */
  async updateAuthorityComplaintStatus({ authorityId, complaintId, status }) {
    try {
      const response = await this.client.patch(
        `/authority/${authorityId}/complaints/${complaintId}/status`,
        { status }
      );
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update status',
      };
    }
  }

  /**
   * Add note to complaint by authority
   * POST /api/v1/authority/:authorityId/complaints/:complaintId/notes
   */
  async addAuthorityComplaintNote({ authorityId, complaintId, note }) {
    try {
      const response = await this.client.post(
        `/authority/${authorityId}/complaints/${complaintId}/notes`,
        { note }
      );
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to add note',
      };
    }
  }

  /**
   * Log authority action (audit trail)
   * POST /api/v1/authority/:authorityId/actions
   */
  async logAuthorityAction({ authorityId, complaintId, actionType, notes }) {
    try {
      const response = await this.client.post(`/authority/${authorityId}/actions`, {
        complaintId,
        actionType,
        notes,
      });
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      // Silent fail for audit logging - don't disrupt user flow
      if (isDevelopment) {
        console.error('Failed to log authority action:', error);
      }
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Decrypt complaint (legacy endpoint)
   * POST /api/v1/authority/decrypt
   */
  async decryptComplaint(complaintId, authorityId) {
    try {
      const response = await this.client.post('/authority/decrypt', {
        complaintId,
        authorityId,
      });
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to decrypt complaint',
      };
    }
  }

  // ============================================
  // PATTERN DETECTION ENDPOINTS
  // ============================================

  /**
   * Get pattern analysis
   * GET /api/v1/patterns
   */
  async getPatterns() {
    try {
      const response = await this.client.get('/patterns');
      return {
        success: true,
        patterns: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch patterns',
      };
    }
  }

  /**
   * Get department patterns
   * GET /api/v1/patterns/department
   */
  async getDepartmentPatterns() {
    try {
      const response = await this.client.get('/patterns/department');
      return {
        success: true,
        departments: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch department patterns',
      };
    }
  }

  /**
   * Get pattern alerts
   * GET /api/v1/patterns/alerts
   */
  async getPatternAlerts() {
    try {
      const response = await this.client.get('/patterns/alerts');
      return {
        success: true,
        alerts: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch alerts',
      };
    }
  }

  /**
   * Get comprehensive pattern report
   * GET /api/v1/patterns/report
   */
  async getPatternReport() {
    try {
      const response = await this.client.get('/patterns/report');
      return {
        success: true,
        report: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch pattern report',
      };
    }
  }

  /**
   * Get pattern analytics for authority dashboard
   * GET /api/v1/authority/:authorityId/analytics
   */
  async getPatternAnalytics({ authorityId, timeRange = '30d' }) {
    try {
      const response = await this.client.get(
        `/authority/${authorityId}/analytics?timeRange=${timeRange}`
      );
      return {
        success: true,
        analytics: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch analytics',
      };
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Health check endpoint
   * GET /api/v1/health
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Health check failed',
      };
    }
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

const apiService = new APIService();

export default apiService;

