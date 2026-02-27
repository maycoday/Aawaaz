# Custom React Hooks - Aawaaz Platform

## Overview

Custom React hooks for the Aawaaz harassment reporting platform. These hooks encapsulate complex logic for encryption, complaint submission, authority authentication, and decryption.

## Available Hooks

### 1. useEncryption

**Purpose:** Handle complaint encryption and decryption operations.

**Returns:**
- `encryptComplaint(data, authorities)` - Encrypts complaint for multiple authorities
- `decryptComplaint(payload, privateKey)` - Decrypts complaint with private key
- `isEncrypting` - Loading state during encryption
- `error` - Error message if operation fails

**Usage:**
```javascript
import { useEncryption } from './hooks';

function EncryptionExample() {
  const { encryptComplaint, isEncrypting, error } = useEncryption();

  const handleEncrypt = async () => {
    const encrypted = await encryptComplaint(complaintData, authorities);
    
    if (encrypted) {
      console.log('Encrypted successfully:', encrypted);
    } else {
      console.error('Encryption failed:', error);
    }
  };

  return (
    <button onClick={handleEncrypt} disabled={isEncrypting}>
      {isEncrypting ? 'Encrypting...' : 'Encrypt'}
    </button>
  );
}
```

---

### 2. useComplaint

**Purpose:** Manage complaint submission workflow (encryption + API submission).

**Returns:**
- `submitComplaint(data, authorities)` - Submits encrypted complaint
- `isSubmitting` - Loading state during submission
- `trackingId` - Reference code for submitted complaint
- `error` - Error message if submission fails
- `resetState()` - Resets state to initial values
- `getComplaintByTrackingId(id)` - Fetches complaint by ID

**Usage:**
```javascript
import { useComplaint } from './hooks';

function ComplaintForm() {
  const { submitComplaint, isSubmitting, trackingId, error } = useComplaint();

  const handleSubmit = async (formData, authorities) => {
    const result = await submitComplaint(formData, authorities);
    
    if (result.success) {
      alert(`Complaint submitted! Tracking ID: ${trackingId}`);
    } else {
      alert(`Error: ${error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
      </button>
      
      {trackingId && (
        <div className="success">
          Your tracking ID: {trackingId}
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

---

### 3. useAuthority

**Purpose:** Manage authority authentication and session.

**Returns:**
- `login(credentials)` - Authenticates authority user
- `logout()` - Logs out and clears session
- `fetchComplaints(options)` - Fetches complaints for authority
- `updateComplaintStatus(id, status)` - Updates complaint status
- `addComplaintNote(id, note)` - Adds note to complaint
- `isAuthenticated` - True if logged in
- `authority` - Current authority user data
- `complaints` - List of complaints
- `isLoading` - Loading state
- `error` - Error message

**Usage:**
```javascript
import { useAuthority } from './hooks';

function AuthorityLogin() {
  const { login, isAuthenticated, authority, isLoading, error } = useAuthority();
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const result = await login(credentials);
    
    if (result.success) {
      console.log('Logged in as:', authority.name);
      // Redirect to dashboard
    } else {
      console.error('Login failed:', error);
    }
  };

  if (isAuthenticated) {
    return <div>Welcome, {authority.name}!</div>;
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Authority ID or Email"
        value={credentials.identifier}
        onChange={(e) => setCredentials({...credentials, identifier: e.target.value})}
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
      />
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

**Fetch Complaints Example:**
```javascript
function ComplaintList() {
  const { fetchComplaints, complaints, isLoading } = useAuthority();

  useEffect(() => {
    fetchComplaints({ status: 'pending', page: 1, limit: 20 });
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {complaints.map(complaint => (
        <div key={complaint.id}>
          <h3>{complaint.type}</h3>
          <p>Status: {complaint.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. useDecryption

**Purpose:** Handle complaint decryption by authorities.

**Returns:**
- `decryptComplaint(encryptedData, iv, key, privateKey)` - Decrypts complaint
- `decryptWithStoredKey(authorityId, data, iv, key)` - Decrypts using stored key
- `storePrivateKey(authorityId, privateKey)` - Stores key in IndexedDB
- `retrievePrivateKey(authorityId)` - Retrieves stored key
- `clearPrivateKey(authorityId)` - Removes stored key
- `verifyKeyPair(privateKey, publicKey)` - Verifies key pair matches
- `isDecrypting` - Loading state
- `decryptedData` - Decrypted complaint data
- `error` - Error message
- `resetState()` - Resets state
- `clearDecryptedData()` - Clears decrypted data from memory

**Usage:**
```javascript
import { useDecryption } from './hooks';

function DecryptionModal({ complaint, authorityId }) {
  const {
    decryptComplaint,
    decryptWithStoredKey,
    storePrivateKey,
    isDecrypting,
    decryptedData,
    error
  } = useDecryption();
  
  const [privateKey, setPrivateKey] = useState('');
  const [useStored, setUseStored] = useState(false);

  const handleDecrypt = async () => {
    if (useStored) {
      // Use stored key
      await decryptWithStoredKey(
        authorityId,
        complaint.encryptedData,
        complaint.iv,
        complaint.encryptedAESKey
      );
    } else {
      // Use manually entered key
      await decryptComplaint(
        complaint.encryptedData,
        complaint.iv,
        complaint.encryptedAESKey,
        privateKey
      );
    }
  };

  const handleStoreKey = async () => {
    const stored = await storePrivateKey(authorityId, privateKey);
    if (stored) {
      alert('Private key stored securely in IndexedDB');
    }
  };

  return (
    <div className="decryption-modal">
      <h2>Decrypt Complaint</h2>
      
      <label>
        <input
          type="checkbox"
          checked={useStored}
          onChange={(e) => setUseStored(e.target.checked)}
        />
        Use stored private key
      </label>

      {!useStored && (
        <div>
          <textarea
            placeholder="Paste your RSA private key (PEM format)"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={10}
          />
          
          <button onClick={handleStoreKey}>
            Store Key for Future Use
          </button>
        </div>
      )}

      <button onClick={handleDecrypt} disabled={isDecrypting}>
        {isDecrypting ? 'Decrypting...' : 'Decrypt'}
      </button>

      {error && <div className="error">{error}</div>}

      {decryptedData && (
        <div className="decrypted-content">
          <h3>Decrypted Complaint</h3>
          <p><strong>Type:</strong> {decryptedData.incidentType}</p>
          <p><strong>Date:</strong> {decryptedData.incidentDate}</p>
          <p><strong>Department:</strong> {decryptedData.department}</p>
          <p><strong>Description:</strong></p>
          <p>{decryptedData.complaintText}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Hook Composition

Hooks can be composed together for complex workflows:

```javascript
import { useAuthority, useDecryption } from './hooks';

function ComplaintDetailView({ complaintId }) {
  const { authority, isAuthenticated } = useAuthority();
  const { decryptWithStoredKey, decryptedData, isDecrypting } = useDecryption();

  const handleDecrypt = async (complaint) => {
    if (!isAuthenticated) {
      alert('Please login first');
      return;
    }

    await decryptWithStoredKey(
      authority.id,
      complaint.encryptedData,
      complaint.iv,
      complaint.encryptedAESKey
    );
  };

  // Component implementation...
}
```

---

## Best Practices

### 1. Error Handling

Always check for errors after hook operations:

```javascript
const { submitComplaint, error } = useComplaint();

const result = await submitComplaint(data, authorities);

if (!result.success) {
  // Handle error
  console.error(error);
  alert(`Submission failed: ${error}`);
}
```

### 2. Loading States

Use loading states for better UX:

```javascript
const { isSubmitting } = useComplaint();

return (
  <button disabled={isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </button>
);
```

### 3. State Reset

Reset state when appropriate (e.g., after modal close):

```javascript
const { resetState } = useComplaint();

const handleModalClose = () => {
  resetState();
  setModalOpen(false);
};
```

### 4. Memory Cleanup

Clear sensitive data when done:

```javascript
const { clearDecryptedData } = useDecryption();

useEffect(() => {
  return () => {
    // Cleanup on unmount
    clearDecryptedData();
  };
}, [clearDecryptedData]);
```

---

## Hook Dependencies

- **useEncryption**: `encryptionService`
- **useComplaint**: `apiService`, `useEncryption`
- **useAuthority**: `apiService`
- **useDecryption**: `encryptionService`, IndexedDB

---

## Security Considerations

### Private Key Storage

The `useDecryption` hook stores private keys in **IndexedDB**, which is:
- ✅ More secure than localStorage
- ✅ Not accessible via JavaScript injection
- ✅ Isolated per origin
- ✅ Encrypted by browser

**Important:** Users should be warned that:
- Private keys are stored locally on their device
- They should logout from shared computers
- Keys are cleared when `clearPrivateKey()` is called

### Session Management

The `useAuthority` hook:
- Stores JWT tokens in localStorage
- Auto-restores sessions on page reload
- Clears sensitive data on logout
- Redirects to login on 401 errors (via API service)

---

## Testing

### Unit Testing Example

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useComplaint } from './useComplaint';

describe('useComplaint', () => {
  it('should submit complaint successfully', async () => {
    const { result } = renderHook(() => useComplaint());

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.trackingId).toBe(null);

    await act(async () => {
      const response = await result.current.submitComplaint(
        mockComplaintData,
        mockAuthorities
      );
      expect(response.success).toBe(true);
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.trackingId).toBeTruthy();
  });
});
```

---

## Troubleshooting

### Issue: "Cannot read property of undefined"

**Cause:** Hook used before data is loaded

**Solution:** Check loading state before accessing data
```javascript
const { authority, isLoading } = useAuthority();

if (isLoading) return <Loading />;
if (!authority) return <Login />;

return <Dashboard authority={authority} />;
```

### Issue: Decryption fails with "Invalid private key"

**Cause:** Private key format incorrect or doesn't match

**Solution:** Verify PEM format and key pair match
```javascript
const { verifyKeyPair } = useDecryption();

const isValid = await verifyKeyPair(privateKey, publicKey);

if (!isValid) {
  alert('Private key does not match this authority');
}
```

### Issue: "Authority not logged in"

**Cause:** Trying to fetch complaints without authentication

**Solution:** Check authentication before fetching
```javascript
const { isAuthenticated, fetchComplaints } = useAuthority();

useEffect(() => {
  if (isAuthenticated) {
    fetchComplaints();
  }
}, [isAuthenticated]);
```

---

## Performance Tips

### 1. Memoization

Hooks use `useCallback` internally for optimal performance. No additional memoization needed.

### 2. Avoid Unnecessary Re-renders

Destructure only needed values:
```javascript
// Good
const { login, isLoading } = useAuthority();

// Avoid (causes re-renders on all state changes)
const authority = useAuthority();
```

### 3. Conditional Hook Calls

Call hooks at component top level, but conditionally execute functions:
```javascript
const { decryptComplaint } = useDecryption();

// Good
const handleClick = () => {
  if (hasPermission) {
    decryptComplaint(...);
  }
};

// Bad (breaks Rules of Hooks)
if (hasPermission) {
  const { decryptComplaint } = useDecryption();
}
```

---

## API Reference Summary

| Hook | Primary Function | Secondary Functions | Loading State | Error State |
|------|------------------|---------------------|---------------|-------------|
| **useEncryption** | encryptComplaint | decryptComplaint | isEncrypting | error |
| **useComplaint** | submitComplaint | resetState, getComplaintByTrackingId | isSubmitting | error + trackingId |
| **useAuthority** | login | logout, fetchComplaints, updateComplaintStatus, addComplaintNote | isLoading | error + isAuthenticated + authority + complaints |
| **useDecryption** | decryptComplaint | storePrivateKey, retrievePrivateKey, clearPrivateKey, decryptWithStoredKey, verifyKeyPair | isDecrypting | error + decryptedData |

---

**Last Updated:** February 14, 2026  
**Version:** 1.0  
**Maintainers:** Aawaaz Development Team
