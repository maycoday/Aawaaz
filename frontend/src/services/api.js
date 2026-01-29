import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const apiService = {
  // Complaint endpoints
  submitComplaint: async (encryptedPayload) => {
    const response = await apiClient.post('/complaints', encryptedPayload);
    return response.data;
  },

  getComplaint: async (id) => {
    const response = await apiClient.get(`/complaints/${id}`);
    return response.data;
  },

  listComplaints: async () => {
    const response = await apiClient.get('/complaints');
    return response.data;
  },

  // Authority endpoints
  listAuthorities: async () => {
    const response = await apiClient.get('/authorities');
    return response.data;
  },

  getAuthority: async (id) => {
    const response = await apiClient.get(`/authorities/${id}`);
    return response.data;
  },

  // Pattern detection endpoints
  getPatterns: async () => {
    const response = await apiClient.get('/patterns');
    return response.data;
  },

  getDepartmentPatterns: async () => {
    const response = await apiClient.get('/patterns/department');
    return response.data;
  },

  // Authority access endpoints (requires authentication)
  getAuthorityComplaints: async (token) => {
    const response = await apiClient.get('/authority/complaints', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  decryptComplaint: async (complaintId, authorityId, token) => {
    const response = await apiClient.post(
      '/authority/decrypt',
      { complaintId, authorityId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default apiService;
