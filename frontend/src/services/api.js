const STORAGE_KEY = 'aawaaj:complaints';

const AUTHORITY_CATALOG = [
  {
    id: 'auth-icc-001',
    type: 'icc',
    name: 'Internal Complaints Committee',
    organization: 'Company ICC',
    publicKey: 'demo-public-key-icc'
  },
  {
    id: 'auth-ngo-001',
    type: 'ngo',
    name: 'Independent NGO',
    organization: 'SafeWork Foundation',
    publicKey: 'demo-public-key-ngo'
  },
  {
    id: 'auth-hr-001',
    type: 'hr',
    name: 'Human Resources',
    organization: 'People Operations',
    publicKey: 'demo-public-key-hr'
  },
  {
    id: 'auth-legal-001',
    type: 'legal',
    name: 'Legal Aid Partner',
    organization: 'Pro Bono Legal',
    publicKey: 'demo-public-key-legal'
  }
];

const readStoredComplaints = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredComplaints = (complaints) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
};

const calculateDepartmentStats = (complaints) => {
  const stats = {};
  complaints.forEach((complaint) => {
    const department = complaint?.metadata?.department || 'unspecified';
    if (!stats[department]) {
      stats[department] = { total: 0 };
    }
    stats[department].total += 1;
  });
  return stats;
};

const buildPatternAlerts = (complaints) => {
  const departmentStats = calculateDepartmentStats(complaints);
  return Object.entries(departmentStats).map(([department, stats]) => ({
    department,
    total: stats.total,
    alertTriggered: stats.total >= 3
  }));
};

const apiService = {
  // Complaint endpoints (local demo storage)
  submitComplaint: async (encryptedPayload) => {
    const complaints = readStoredComplaints();
    const now = new Date().toISOString();
    const entry = {
      id: `complaint-${Date.now()}`,
      createdAt: now,
      ...encryptedPayload
    };
    complaints.unshift(entry);
    writeStoredComplaints(complaints);
    return { referenceCode: encryptedPayload.referenceCode };
  },

  getComplaint: async (id) => {
    const complaints = readStoredComplaints();
    return complaints.find((complaint) => complaint.id === id) || null;
  },

  listComplaints: async () => {
    return readStoredComplaints();
  },

  // Authority endpoints
  listAuthorities: async () => {
    return AUTHORITY_CATALOG;
  },

  getAuthority: async (id) => {
    return AUTHORITY_CATALOG.find((authority) => authority.id === id) || null;
  },

  // Pattern detection endpoints
  getPatterns: async () => {
    const complaints = readStoredComplaints();
    return buildPatternAlerts(complaints);
  },

  getDepartmentPatterns: async () => {
    const complaints = readStoredComplaints();
    return calculateDepartmentStats(complaints);
  },

  // Authority access endpoints (demo placeholders)
  getAuthorityComplaints: async () => {
    return readStoredComplaints();
  },

  decryptComplaint: async (complaintId, authorityId) => {
    const complaint = await apiService.getComplaint(complaintId);
    return {
      complaint,
      authorityId,
      decrypted: false,
      message: 'Demo mode: decryption happens only in the client.'
    };
  },

  // Health check
  healthCheck: async () => {
    return { status: 'ok', mode: 'frontend-only' };
  },
};

export default apiService;
