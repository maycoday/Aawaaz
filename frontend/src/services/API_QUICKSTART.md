# API Service Quick Start Guide

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

Dependencies installed:
- `axios@^1.6.2` - HTTP client
- `react@^18.2.0` - React framework
- `react-router-dom@^6.20.1` - Routing

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env
nano .env
```

**Required variables:**
```bash
VITE_API_URL=http://localhost:8080/api/v1
VITE_MODE=development
```

### 3. Start Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.0.8  ready in 200 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Testing API Service

### Import the Service

```javascript
import apiService from './services/api';
```

### Test Methods

#### 1. Health Check

```javascript
// Test basic connectivity
const result = await apiService.healthCheck();

console.log(result);
// Expected: { success: true, status: "healthy", ... }
```

#### 2. Fetch Authorities

```javascript
// Get list of authorities
const result = await apiService.fetchAuthorities();

if (result.success) {
  console.log('Authorities:', result.authorities);
} else {
  console.error('Error:', result.error);
}
```

#### 3. Authority Login

```javascript
// Login as authority
const result = await apiService.authorityLogin({
  identifier: 'auth-hr-001',
  password: 'securePassword123'
});

if (result.success) {
  console.log('Logged in:', result.authority);
  console.log('Token saved automatically');
} else {
  console.error('Login failed:', result.error);
}
```

#### 4. Submit Complaint (with Encryption)

```javascript
import encryptionService from './services/encryption';

// 1. Encrypt complaint data
const complaintData = {
  complaintText: 'Test complaint',
  incidentDate: '2026-02-14',
  department: 'Engineering',
  incidentType: 'sexual_harassment',
  location: 'Office Building A',
  witnessInfo: 'None',
  evidenceFiles: []
};

// 2. Get authorities and their public keys
const authResult = await apiService.fetchAuthorities();
const authorities = authResult.authorities;

// 3. Encrypt for each authority
const encryptedPayload = await encryptionService.encryptComplaint(
  complaintData,
  authorities
);

// 4. Submit encrypted complaint
const result = await apiService.submitComplaint(encryptedPayload);

if (result.success) {
  console.log('Complaint submitted!');
  console.log('Reference Code:', result.referenceCode);
} else {
  console.error('Submission failed:', result.error);
}
```

#### 5. Get Authority Complaints

```javascript
// Must be logged in first
await apiService.authorityLogin({
  identifier: 'auth-hr-001',
  password: 'password123'
});

// Get complaints for this authority
const result = await apiService.getAuthorityComplaints({
  authorityId: 'auth-hr-001',
  status: 'pending',
  page: 1,
  limit: 20
});

if (result.success) {
  console.log('Complaints:', result.complaints);
  console.log('Total:', result.total);
}
```

#### 6. Update Complaint Status

```javascript
const result = await apiService.updateAuthorityComplaintStatus({
  authorityId: 'auth-hr-001',
  complaintId: 'complaint-123',
  status: 'under_review'
});

if (result.success) {
  console.log('Status updated successfully');
}
```

#### 7. Add Note to Complaint

```javascript
const result = await apiService.addAuthorityComplaintNote({
  authorityId: 'auth-hr-001',
  complaintId: 'complaint-123',
  note: 'Initial review completed. Case requires escalation.'
});

if (result.success) {
  console.log('Note added successfully');
}
```

#### 8. Get Pattern Analytics

```javascript
const result = await apiService.getPatternReport();

if (result.success) {
  console.log('Pattern Report:', result.report);
  console.log('High Risk Departments:', result.report.highRiskCount);
  console.log('Alerts:', result.report.alerts);
}
```

## Console Testing

Open browser console (F12) and test directly:

```javascript
// Health check
apiService.healthCheck().then(r => console.log(r));

// Fetch authorities
apiService.fetchAuthorities().then(r => console.log(r));

// Login
apiService.authorityLogin({
  identifier: 'auth-hr-001',
  password: 'password123'
}).then(r => console.log(r));

// Get complaints
apiService.getAuthorityComplaints({
  authorityId: 'auth-hr-001'
}).then(r => console.log(r));
```

## React Component Integration

### Example: Login Form

```jsx
import { useState } from 'react';
import apiService from '../services/api';

function LoginForm() {
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await apiService.authorityLogin(credentials);

    if (result.success) {
      console.log('Logged in:', result.authority);
      // Redirect to dashboard
      window.location.href = '/authority/dashboard';
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Authority ID or Email"
        value={credentials.identifier}
        onChange={(e) => setCredentials({
          ...credentials,
          identifier: e.target.value
        })}
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({
          ...credentials,
          password: e.target.value
        })}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

### Example: Complaint List

```jsx
import { useState, useEffect } from 'react';
import apiService from '../services/api';

function ComplaintList({ authorityId }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    const result = await apiService.getAuthorityComplaints({
      authorityId,
      status: 'pending',
      page: 1,
      limit: 20
    });

    if (result.success) {
      setComplaints(result.complaints);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    const result = await apiService.updateAuthorityComplaintStatus({
      authorityId,
      complaintId,
      status: newStatus
    });

    if (result.success) {
      // Reload complaints
      loadComplaints();
    } else {
      alert(`Failed to update: ${result.error}`);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Complaints</h2>
      {complaints.map(complaint => (
        <div key={complaint.id}>
          <p>ID: {complaint.id}</p>
          <p>Status: {complaint.status}</p>
          <button onClick={() => handleStatusChange(complaint.id, 'under_review')}>
            Start Review
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Development Tips

### 1. Enable Console Logging

Ensure you're in development mode:
```bash
# .env
VITE_MODE=development
```

All API requests/responses will be logged:
```
🌐 API Request: POST /complaints/submit
📦 Request Data: {...}
✅ API Response: 200 {...}
```

### 2. Check Token

```javascript
// Check if user is authenticated
const token = apiService.getToken();
console.log('Token:', token);

// If null, user needs to login
if (!token) {
  console.log('User not authenticated');
}
```

### 3. Handle Network Errors

```javascript
const result = await apiService.fetchAuthorities();

if (!result.success) {
  if (result.error.includes('Network')) {
    alert('Backend server is not running. Start it with: cd backend && go run .');
  } else {
    alert(`Error: ${result.error}`);
  }
}
```

### 4. Mock Data (Development)

For development without backend:

```javascript
// Create mock API service
const mockApiService = {
  async fetchAuthorities() {
    return {
      success: true,
      authorities: [
        {
          id: 'auth-hr-001',
          name: 'HR Department',
          type: 'HR',
          publicKey: '-----BEGIN PUBLIC KEY-----\n...'
        }
      ]
    };
  },
  // ... other methods
};

// Use in development
const apiService = process.env.NODE_ENV === 'development' 
  ? mockApiService 
  : realApiService;
```

## Troubleshooting

### Backend Not Running

**Error:** Network error / No response from server

**Solution:**
```bash
# Start backend
cd backend
export DB_PASSWORD=your_password
go run .

# Should see:
# 🚀 Aawaaj API Server starting on port 8080
```

### CORS Error

**Error:** CORS policy: No 'Access-Control-Allow-Origin'

**Solution:** Backend must allow frontend URL:
```go
// backend/main.go
AllowedOrigins: []string{
  "http://localhost:5173",  // Vite dev server
}
```

### 401 Unauthorized

**Error:** All authenticated requests return 401

**Solution:**
1. Login again: `await apiService.authorityLogin(...)`
2. Check token: `console.log(apiService.getToken())`
3. Token may have expired - logout and login again

### Import Error

**Error:** Cannot find module './services/api'

**Solution:**
```bash
# Check file exists
ls frontend/src/services/api.js

# If missing, file path might be wrong
# Use relative path: '../services/api'
```

## Production Build

### Build for Production

```bash
npm run build
```

### Test Production Build

```bash
npm run preview
```

### Environment Variables

Production `.env`:
```bash
VITE_API_URL=https://api.aawaaz.com/api/v1
VITE_MODE=production
```

## Testing Checklist

- [ ] Backend server is running (port 8080)
- [ ] Frontend dev server is running (port 5173)
- [ ] Environment variables configured (.env file exists)
- [ ] Health check passes
- [ ] Can fetch authorities
- [ ] Can login as authority
- [ ] Can fetch complaints (authenticated)
- [ ] Can update complaint status
- [ ] Can add notes
- [ ] Pattern analytics working
- [ ] No CORS errors in console
- [ ] No network errors

## Next Steps

1. **Read full documentation:** [API_SERVICE_README.md](./API_SERVICE_README.md)
2. **Implement authentication:** Use `authorityLogin()` for login flow
3. **Build complaint list:** Use `getAuthorityComplaints()` for dashboard
4. **Add pattern analytics:** Use `getPatternReport()` for visualizations
5. **Test error handling:** Simulate errors to verify error messages
6. **Production deployment:** Update API URL and test in staging environment

---

**Need Help?**
- Check browser console for errors (F12)
- Verify backend is running with health check
- Review API_SERVICE_README.md for detailed documentation
- Test endpoints with curl or Postman first

**Last Updated:** February 14, 2026
