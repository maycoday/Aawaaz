# Frontend API Service Documentation

## Overview

The API Service is a class-based HTTP client that handles all communication between the frontend and backend. It uses Axios with automatic JWT token injection, comprehensive error handling, and development logging.

## Features

✅ **Class-based architecture** - Singleton instance exported for consistent state  
✅ **Automatic JWT injection** - Tokens automatically added to authenticated requests  
✅ **30-second timeout** - Configurable timeout for all requests  
✅ **Global error handling** - 401/403/404/500 errors handled automatically  
✅ **Development logging** - Request/response logging in dev mode only  
✅ **Token management** - Built-in methods for storing/retrieving/clearing tokens  
✅ **Error responses** - Consistent error format across all methods  

## Configuration

### Environment Variables

```bash
# .env file (Vite uses VITE_ prefix)
VITE_API_URL=http://localhost:8080/api/v1
```

**Default:** `http://localhost:8080/api/v1` if not set

### Timeout

Default timeout is **30 seconds** for all requests.

## Usage

### Import the Service

```javascript
import apiService from './services/api';
```

### Basic Example

```javascript
// Submit a complaint
const result = await apiService.submitComplaint(encryptedData);

if (result.success) {
  console.log('Complaint submitted:', result.referenceCode);
} else {
  console.error('Error:', result.error);
}
```

## API Methods

### 🔐 Authentication

#### `authorityLogin(credentials)`
Login authority user and store JWT token.

```javascript
const result = await apiService.authorityLogin({
  identifier: 'auth-hr-001',
  password: 'securePassword123'
});

if (result.success) {
  console.log('Logged in:', result.authority);
  console.log('Token stored automatically');
} else {
  console.error('Login failed:', result.error);
}
```

**Request:**
```json
{
  "identifier": "auth-hr-001",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "authority": {
    "id": "auth-hr-001",
    "name": "HR Department",
    "type": "HR"
  }
}
```

#### `authorityLogout()`
Clear stored JWT token.

```javascript
apiService.authorityLogout();
// Token is removed, user logged out
```

### 📝 Complaint Submission

#### `submitComplaint(encryptedData)`
Submit an encrypted complaint.

```javascript
const encryptedData = {
  encryptedPayload: "base64_encrypted_data...",
  iv: "base64_iv...",
  encryptedKeys: [
    {
      authorityId: "auth-hr-001",
      encryptedKey: "base64_encrypted_aes_key..."
    }
  ],
  anonymizedMetadata: {
    incidentType: "sexual_harassment",
    departmentHash: "sha256_hash...",
    timestamp: "2026-02-14T10:00:00Z"
  }
};

const result = await apiService.submitComplaint(encryptedData);

if (result.success) {
  console.log('Reference Code:', result.referenceCode);
} else {
  console.error('Error:', result.error);
}
```

**Response:**
```json
{
  "success": true,
  "referenceCode": "ABCD-1234-EFGH",
  "message": "Complaint submitted successfully"
}
```

### 👥 Authority Endpoints

#### `fetchAuthorities()`
Get list of all authorities.

```javascript
const result = await apiService.fetchAuthorities();

if (result.success) {
  console.log('Authorities:', result.authorities);
}
```

**Response:**
```json
{
  "success": true,
  "authorities": [
    {
      "id": "auth-hr-001",
      "name": "HR Department",
      "type": "HR",
      "publicKey": "-----BEGIN PUBLIC KEY-----..."
    }
  ]
}
```

### 📋 Complaint Management (Authenticated)

#### `getComplaintList(token)`
Get list of complaints (requires authentication).

```javascript
const token = localStorage.getItem('authority_token');
const result = await apiService.getComplaintList(token);

if (result.success) {
  console.log('Complaints:', result.complaints);
}
```

#### `getComplaintDetail(id, token)`
Get detailed complaint information.

```javascript
const result = await apiService.getComplaintDetail('complaint-123', token);

if (result.success) {
  console.log('Complaint:', result.complaint);
}
```

#### `updateComplaintStatus(id, status, token)`
Update complaint status.

```javascript
const result = await apiService.updateComplaintStatus(
  'complaint-123',
  'under_review',
  token
);

if (result.success) {
  console.log('Status updated');
}
```

**Allowed statuses:** `pending`, `under_review`, `escalated`, `resolved`, `archived`

#### `addAuthorityNote(id, note, token)`
Add internal note to complaint.

```javascript
const result = await apiService.addAuthorityNote(
  'complaint-123',
  'Initial review completed. Escalating to legal team.',
  token
);

if (result.success) {
  console.log('Note added');
}
```

### 🔑 Authority-Specific Endpoints

These methods automatically use the stored JWT token from `localStorage`.

#### `getAuthorityComplaints({ authorityId, status, page, limit })`
Get complaints assigned to specific authority.

```javascript
const result = await apiService.getAuthorityComplaints({
  authorityId: 'auth-hr-001',
  status: 'pending',
  page: 1,
  limit: 20
});

if (result.success) {
  console.log('Complaints:', result.complaints);
  console.log('Total:', result.total);
  console.log('Page:', result.page);
}
```

**Parameters:**
- `authorityId` (required): Authority ID
- `status` (optional): Filter by status (`pending`, `under_review`, `resolved`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

#### `getAuthorityComplaintDetail(authorityId, complaintId)`
Get detailed complaint for authority.

```javascript
const result = await apiService.getAuthorityComplaintDetail(
  'auth-hr-001',
  'complaint-123'
);

if (result.success) {
  console.log('Complaint:', result.complaint);
  console.log('Encrypted payload:', result.encryptedPayload);
  console.log('Encrypted AES key:', result.encryptedKey);
}
```

#### `updateAuthorityComplaintStatus({ authorityId, complaintId, status })`
Update complaint status by authority.

```javascript
const result = await apiService.updateAuthorityComplaintStatus({
  authorityId: 'auth-hr-001',
  complaintId: 'complaint-123',
  status: 'under_review'
});
```

#### `addAuthorityComplaintNote({ authorityId, complaintId, note })`
Add note to complaint by authority.

```javascript
const result = await apiService.addAuthorityComplaintNote({
  authorityId: 'auth-hr-001',
  complaintId: 'complaint-123',
  note: 'Meeting scheduled with complainant for 2026-02-20'
});
```

#### `logAuthorityAction({ authorityId, complaintId, actionType, notes })`
Log authority action for audit trail.

```javascript
const result = await apiService.logAuthorityAction({
  authorityId: 'auth-hr-001',
  complaintId: 'complaint-123',
  actionType: 'viewed',
  notes: 'Opened complaint details'
});

// This method fails silently to avoid disrupting user flow
```

**Action types:** `viewed`, `updated_status`, `escalated`, `resolved`, `archived`, `downloaded`

### 📊 Pattern Detection

#### `getPatterns()`
Get pattern analysis data.

```javascript
const result = await apiService.getPatterns();

if (result.success) {
  console.log('Patterns:', result.patterns);
}
```

**Response:**
```json
{
  "success": true,
  "patterns": [
    {
      "departmentHash": "a1b2c3d4e5f6...",
      "incidentCount": 7,
      "riskLevel": "high",
      "trendDirection": "increasing",
      "lastIncident": "2026-02-14T10:30:00Z",
      "recentSpike": true,
      "incidentTypes": ["sexual_harassment", "verbal_harassment"]
    }
  ]
}
```

#### `getDepartmentPatterns()`
Get patterns grouped by department.

```javascript
const result = await apiService.getDepartmentPatterns();

if (result.success) {
  console.log('Department patterns:', result.departments);
}
```

#### `getPatternAlerts()`
Get generated pattern alerts.

```javascript
const result = await apiService.getPatternAlerts();

if (result.success) {
  console.log('Alerts:', result.alerts);
}
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert-abc123-1708084800",
      "alertType": "threshold_breach",
      "severity": "critical",
      "departmentHash": "abc123...",
      "message": "Department has 7 incidents in 30 days",
      "incidentCount": 7,
      "timestamp": "2026-02-14T12:00:00Z"
    }
  ]
}
```

#### `getPatternReport()`
Get comprehensive pattern analysis report.

```javascript
const result = await apiService.getPatternReport();

if (result.success) {
  console.log('Report:', result.report);
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "generatedAt": "2026-02-14T12:00:00Z",
    "timeRange": "Last 90 days",
    "totalDepartments": 15,
    "highRiskCount": 2,
    "mediumRiskCount": 5,
    "lowRiskCount": 8,
    "patterns": [...],
    "alerts": [...],
    "trends": {...}
  }
}
```

#### `getPatternAnalytics({ authorityId, timeRange })`
Get analytics for authority dashboard.

```javascript
const result = await apiService.getPatternAnalytics({
  authorityId: 'auth-hr-001',
  timeRange: '30d'
});

if (result.success) {
  console.log('Analytics:', result.analytics);
}
```

**Time ranges:** `7d`, `30d`, `90d`, `all`

### 🩺 Health Check

#### `healthCheck()`
Check if API is healthy.

```javascript
const result = await apiService.healthCheck();

if (result.success) {
  console.log('API is healthy:', result.status);
}
```

## Error Handling

### Response Format

All methods return a consistent response format:

**Success:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Error Codes

| Code | Meaning | Auto-Handler Behavior |
|------|---------|----------------------|
| **401** | Unauthorized | Clears token, redirects to `/authority/login` |
| **403** | Forbidden | Logs error to console |
| **404** | Not Found | Logs error to console |
| **500** | Server Error | Logs error to console |
| Network Error | No response | Logs "No response from server" |

### Example Error Handling

```javascript
const result = await apiService.submitComplaint(data);

if (!result.success) {
  // Handle error
  if (result.error.includes('Network')) {
    alert('Network error. Please check your connection.');
  } else {
    alert(`Error: ${result.error}`);
  }
}
```

## Token Management

### Automatic Token Injection

The service automatically injects JWT tokens for authenticated requests:

```javascript
// Token is automatically read from localStorage
// and added to Authorization header
const result = await apiService.getAuthorityComplaints({
  authorityId: 'auth-hr-001'
});

// Equivalent to manually adding:
// headers: { Authorization: 'Bearer <token>' }
```

### Manual Token Methods

```javascript
// Get token
const token = apiService.getToken();

// Set token
apiService.setToken('eyJhbGciOiJIUzI1NiIs...');

// Clear token
apiService.clearToken();
```

### Token Storage

Tokens are stored in `localStorage` with key `authority_token`.

### Session Expiry

When a 401 Unauthorized response is received:
1. Token is automatically cleared
2. User is redirected to `/authority/login`
3. Warning is logged to console

## Development Logging

In development mode (`VITE_MODE=development`), all requests and responses are logged:

```
🌐 API Request: POST /complaints/submit
📦 Request Data: {...}
✅ API Response: 200 {...}
```

To disable logging in production, ensure `VITE_MODE=production` in `.env`.

## Request Interceptors

### Request Interceptor
- Automatically injects JWT token if available
- Logs requests in development mode

### Response Interceptor
- Logs successful responses in development
- Handles error codes globally (401, 403, 404, 500)
- Provides network error messages

## Advanced Usage

### Custom Headers

```javascript
// The service instance is accessible
apiService.client.get('/custom-endpoint', {
  headers: {
    'Custom-Header': 'value'
  }
});
```

### Timeout Override

```javascript
// Override timeout for specific request (in ms)
apiService.client.get('/slow-endpoint', {
  timeout: 60000 // 60 seconds
});
```

### Interceptor Customization

```javascript
// Add custom request interceptor
apiService.client.interceptors.request.use(
  (config) => {
    // Modify config
    return config;
  }
);

// Add custom response interceptor
apiService.client.interceptors.response.use(
  (response) => {
    // Handle response
    return response;
  }
);
```

## Testing

### Mock API Service

```javascript
// In tests, you can mock the API service
jest.mock('./services/api', () => ({
  submitComplaint: jest.fn(),
  fetchAuthorities: jest.fn(),
  // ... other methods
}));

// In test
import apiService from './services/api';

apiService.submitComplaint.mockResolvedValue({
  success: true,
  referenceCode: 'TEST-1234'
});
```

### Integration Testing

```javascript
// Test with real API (requires backend running)
describe('API Service Integration', () => {
  it('should submit complaint successfully', async () => {
    const data = { /* encrypted data */ };
    const result = await apiService.submitComplaint(data);
    
    expect(result.success).toBe(true);
    expect(result.referenceCode).toBeDefined();
  });
});
```

## Best Practices

### ✅ Do's

- Always check `result.success` before accessing data
- Use try-catch for additional error handling if needed
- Store sensitive tokens securely (localStorage is acceptable for JWTs)
- Log out users properly with `authorityLogout()`

### ❌ Don'ts

- Don't access `localStorage` directly for tokens (use `getToken()`)
- Don't hardcode API URLs (use environment variables)
- Don't suppress errors without logging them
- Don't store sensitive data in API responses

## Troubleshooting

### Issue: 401 Unauthorized on every request
**Solution:** Check if token is stored correctly:
```javascript
console.log(apiService.getToken());
// Should output JWT token or null
```

### Issue: Network error / no response
**Solution:** 
1. Verify backend is running on correct port
2. Check `VITE_API_URL` in `.env`
3. Verify CORS is enabled on backend

### Issue: CORS errors
**Solution:** Backend must include frontend URL in CORS whitelist:
```go
// backend/main.go
AllowedOrigins: []string{
  "http://localhost:3000",
  "http://localhost:5173",  // Vite dev server
}
```

### Issue: Request timeout
**Solution:** Increase timeout or check backend performance:
```javascript
// Temporarily increase timeout
apiService.timeout = 60000; // 60 seconds
```

## Environment Setup

### Development

```bash
# .env.development
VITE_API_URL=http://localhost:8080/api/v1
VITE_MODE=development
```

### Production

```bash
# .env.production
VITE_API_URL=https://api.aawaaz.com/api/v1
VITE_MODE=production
```

## Migration Guide

### From Old API Service

If migrating from the old object-based service:

**Old:**
```javascript
import apiService from './services/api';
const data = await apiService.submitComplaint(payload);
```

**New:**
```javascript
import apiService from './services/api';
const result = await apiService.submitComplaint(payload);

if (result.success) {
  const data = result; // Access response data
}
```

**Key Changes:**
- All methods now return `{ success, ...data }` format
- Token injection is automatic (no need to pass token manually)
- Error handling is built-in (check `success` property)
- Timeout increased from 10s to 30s

## API Reference Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `submitComplaint(data)` | POST /complaints/submit | No | Submit encrypted complaint |
| `fetchAuthorities()` | GET /authorities | No | Get all authorities |
| `authorityLogin(creds)` | POST /authority/login | No | Login authority user |
| `getComplaintList(token)` | GET /complaints | Yes | Get complaint list |
| `getComplaintDetail(id, token)` | GET /complaints/:id | Yes | Get complaint details |
| `updateComplaintStatus(id, status, token)` | PUT /complaints/:id/status | Yes | Update status |
| `addAuthorityNote(id, note, token)` | POST /complaints/:id/notes | Yes | Add note |
| `getAuthorityComplaints(params)` | GET /authority/:id/complaints | Yes | Get authority complaints |
| `getPatterns()` | GET /patterns | No | Get pattern analysis |
| `getPatternAlerts()` | GET /patterns/alerts | No | Get pattern alerts |
| `getPatternReport()` | GET /patterns/report | No | Get full report |
| `healthCheck()` | GET /health | No | Check API health |

---

**Last Updated:** February 14, 2026  
**Version:** 2.0  
**Author:** Aawaaz Development Team
