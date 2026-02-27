import React, { useState } from 'react';
import encryptionService from '../services/encryption';
import '../styles/DecryptionModal.css';

const DecryptionModal = ({ isOpen, onClose, encryptedKey, onDecryptSuccess }) => {
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState('');
  const [useStoredKey, setUseStoredKey] = useState(true);

  if (!isOpen) return null;

  const handleDecrypt = async () => {
    setError('');
    setDecrypting(true);

    try {
      let privateKey;

      if (useStoredKey) {
        // Try to retrieve from IndexedDB
        privateKey = await retrievePrivateKeyFromStorage();
        
        if (!privateKey) {
          setError('No private key found in storage. Please enter manually or store your key first.');
          setDecrypting(false);
          return;
        }
      } else {
        // Use manually entered key
        if (!privateKeyInput.trim()) {
          setError('Please enter your private key');
          setDecrypting(false);
          return;
        }
        privateKey = privateKeyInput.trim();
      }

      // Import the private key
      const importedPrivateKey = await encryptionService.importRSAPrivateKey(privateKey);

      // Decrypt the AES key
      const encryptedKeyBytes = encryptionService.base64ToArrayBuffer(encryptedKey);
      const aesKeyBytes = await encryptionService.decryptAESKeyWithPrivateKey(
        encryptedKeyBytes,
        importedPrivateKey
      );

      // Import the decrypted AES key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Call success callback with the AES key
      onDecryptSuccess(aesKey);
      onClose();
    } catch (err) {
      console.error('Decryption error:', err);
      setError('Decryption failed. Please check your private key and try again.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleStoreKey = async () => {
    if (!privateKeyInput.trim()) {
      setError('Please enter a private key to store');
      return;
    }

    try {
      await storePrivateKeyInIndexedDB(privateKeyInput.trim());
      alert('Private key stored securely in your browser. You can now use "Use Stored Key" option.');
      setPrivateKeyInput('');
      setUseStoredKey(true);
    } catch (err) {
      console.error('Storage error:', err);
      setError('Failed to store private key');
    }
  };

  const retrievePrivateKeyFromStorage = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AuthorityKeys', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get('privateKey');

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.key || null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    });
  };

  const storePrivateKeyInIndexedDB = (privateKey) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AuthorityKeys', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        const putRequest = store.put({ key: privateKey }, 'privateKey');

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    });
  };

  return (
    <div className="decryption-modal-overlay" onClick={onClose}>
      <div className="decryption-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Decrypt Complaint</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="decryption-security-notice">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V11C2 16.55 5.84 21.74 12 23C18.16 21.74 22 16.55 22 11V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <strong>Security Notice:</strong>
              <p>Your private key is never sent to the server. All decryption happens locally in your browser.</p>
            </div>
          </div>

          <div className="key-source-toggle">
            <label className="toggle-option">
              <input
                type="radio"
                checked={useStoredKey}
                onChange={() => setUseStoredKey(true)}
              />
              <span>Use Stored Key</span>
            </label>
            <label className="toggle-option">
              <input
                type="radio"
                checked={!useStoredKey}
                onChange={() => setUseStoredKey(false)}
              />
              <span>Enter Key Manually</span>
            </label>
          </div>

          {!useStoredKey && (
            <>
              <div className="form-group">
                <label htmlFor="privateKey">RSA Private Key (PEM Format)</label>
                <textarea
                  id="privateKey"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows="8"
                  disabled={decrypting}
                />
              </div>

              <button
                className="store-key-button"
                onClick={handleStoreKey}
                disabled={decrypting}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Store Key in Browser
              </button>
            </>
          )}

          {error && (
            <div className="modal-error">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary" onClick={onClose} disabled={decrypting}>
            Cancel
          </button>
          <button 
            className="modal-button primary" 
            onClick={handleDecrypt}
            disabled={decrypting}
          >
            {decrypting ? (
              <>
                <span className="button-spinner"></span>
                Decrypting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Decrypt Complaint
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecryptionModal;
