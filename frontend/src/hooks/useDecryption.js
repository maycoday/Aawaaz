import { useState, useCallback } from 'react';
import encryptionService from '../services/encryption';

/**
 * useDecryption Hook
 * 
 * Custom hook for handling complaint decryption by authorities.
 * Manages client-side decryption with private key, IndexedDB storage,
 * and decrypted data state.
 * 
 * @returns {Object} Decryption utilities and state
 * @returns {Function} decryptComplaint - Decrypts complaint using private key
 * @returns {Function} storePrivateKey - Stores private key in IndexedDB
 * @returns {Function} retrievePrivateKey - Retrieves stored private key
 * @returns {Function} clearPrivateKey - Removes private key from storage
 * @returns {boolean} isDecrypting - Loading state during decryption
 * @returns {Object|null} decryptedData - Decrypted complaint data
 * @returns {string|null} error - Error message if decryption fails
 * @returns {Function} resetState - Resets decryption state
 * 
 * @example
 * const { decryptComplaint, isDecrypting, decryptedData, error } = useDecryption();
 * 
 * const handleDecrypt = async () => {
 *   const result = await decryptComplaint(
 *     encryptedPayload,
 *     encryptedAESKey,
 *     privateKeyPEM
 *   );
 *   
 *   if (result) {
 *     console.log('Decrypted complaint:', decryptedData);
 *   }
 * };
 */
export const useDecryption = () => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState(null);
  const [error, setError] = useState(null);

  // IndexedDB database name and store
  const DB_NAME = 'AawaazSecureStorage';
  const STORE_NAME = 'privateKeys';

  /**
   * Open IndexedDB connection
   * 
   * @returns {Promise<IDBDatabase>} Database connection
   */
  const openDB = useCallback(async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }, []);

  /**
   * Store private key in IndexedDB
   * 
   * @param {string} authorityId - Authority ID
   * @param {string} privateKeyPEM - Private key in PEM format
   * @returns {Promise<boolean>} True if stored successfully
   */
  const storePrivateKey = useCallback(async (authorityId, privateKeyPEM) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise((resolve, reject) => {
        const request = store.put(privateKeyPEM, authorityId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('🔐 Private key stored securely');
      return true;

    } catch (err) {
      console.error('❌ Error storing private key:', err);
      setError('Failed to store private key');
      return false;
    }
  }, [openDB]);

  /**
   * Retrieve private key from IndexedDB
   * 
   * @param {string} authorityId - Authority ID
   * @returns {Promise<string|null>} Private key PEM or null if not found
   */
  const retrievePrivateKey = useCallback(async (authorityId) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const privateKey = await new Promise((resolve, reject) => {
        const request = store.get(authorityId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (privateKey) {
        console.log('🔑 Private key retrieved from secure storage');
      }

      return privateKey || null;

    } catch (err) {
      console.error('❌ Error retrieving private key:', err);
      return null;
    }
  }, [openDB]);

  /**
   * Clear private key from IndexedDB
   * 
   * @param {string} authorityId - Authority ID
   * @returns {Promise<boolean>} True if cleared successfully
   */
  const clearPrivateKey = useCallback(async (authorityId) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise((resolve, reject) => {
        const request = store.delete(authorityId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('🗑️ Private key cleared from storage');
      return true;

    } catch (err) {
      console.error('❌ Error clearing private key:', err);
      return false;
    }
  }, [openDB]);

  /**
   * Decrypt complaint using authority's private key
   * 
   * @param {string} encryptedData - Base64 encoded encrypted complaint data
   * @param {string} iv - Base64 encoded initialization vector
   * @param {string} encryptedAESKey - Base64 encoded encrypted AES key
   * @param {string} privateKeyPEM - Authority's RSA private key (PEM format)
   * @returns {Promise<Object|null>} Decrypted complaint data or null on error
   */
  const decryptComplaint = useCallback(async (
    encryptedData,
    iv,
    encryptedAESKey,
    privateKeyPEM
  ) => {
    setIsDecrypting(true);
    setError(null);
    setDecryptedData(null);

    try {
      // Validate inputs
      if (!encryptedData || !iv || !encryptedAESKey) {
        throw new Error('Incomplete encrypted payload');
      }

      if (!privateKeyPEM || typeof privateKeyPEM !== 'string') {
        throw new Error('Invalid private key');
      }

      // Verify PEM format
      if (!privateKeyPEM.includes('BEGIN PRIVATE KEY')) {
        throw new Error('Private key must be in PEM format');
      }

      console.log('🔓 Starting decryption process...');

      // Use encryption service to decrypt
      const decrypted = await encryptionService.decryptComplaintWithPrivateKey(
        encryptedData,
        iv,
        encryptedAESKey,
        privateKeyPEM
      );

      if (!decrypted) {
        throw new Error('Decryption returned no data');
      }

      console.log('✅ Complaint decrypted successfully');

      setDecryptedData(decrypted);
      setIsDecrypting(false);

      return decrypted;

    } catch (err) {
      console.error('❌ Decryption error:', err);
      const errorMessage = err.message || 'Failed to decrypt complaint. Check your private key.';
      setError(errorMessage);
      setIsDecrypting(false);
      return null;
    }
  }, []);

  /**
   * Decrypt complaint using stored private key
   * 
   * @param {string} authorityId - Authority ID
   * @param {string} encryptedData - Base64 encoded encrypted complaint data
   * @param {string} iv - Base64 encoded initialization vector
   * @param {string} encryptedAESKey - Base64 encoded encrypted AES key
   * @returns {Promise<Object|null>} Decrypted complaint data or null on error
   */
  const decryptWithStoredKey = useCallback(async (
    authorityId,
    encryptedData,
    iv,
    encryptedAESKey
  ) => {
    try {
      // Retrieve stored private key
      const privateKey = await retrievePrivateKey(authorityId);

      if (!privateKey) {
        throw new Error('No stored private key found. Please enter your private key manually.');
      }

      // Decrypt using stored key
      return await decryptComplaint(encryptedData, iv, encryptedAESKey, privateKey);

    } catch (err) {
      console.error('❌ Error decrypting with stored key:', err);
      setError(err.message || 'Failed to decrypt with stored key');
      return null;
    }
  }, [retrievePrivateKey, decryptComplaint]);

  /**
   * Verify private key matches authority's public key
   * 
   * @param {string} privateKeyPEM - Private key to verify
   * @param {string} publicKeyPEM - Corresponding public key
   * @returns {Promise<boolean>} True if keys match
   */
  const verifyKeyPair = useCallback(async (privateKeyPEM, publicKeyPEM) => {
    try {
      // Generate test data
      const testData = 'test-message-for-verification';
      
      // Encrypt with public key
      const encrypted = await encryptionService.encryptWithPublicKey(testData, publicKeyPEM);
      
      // Try to decrypt with private key
      const decrypted = await encryptionService.decryptWithPrivateKey(encrypted, privateKeyPEM);
      
      // Check if decryption successful and matches original
      return decrypted === testData;

    } catch (err) {
      console.error('❌ Key verification failed:', err);
      return false;
    }
  }, []);

  /**
   * Reset decryption state to initial values
   */
  const resetState = useCallback(() => {
    setIsDecrypting(false);
    setDecryptedData(null);
    setError(null);
  }, []);

  /**
   * Clear all decrypted data (security measure)
   */
  const clearDecryptedData = useCallback(() => {
    setDecryptedData(null);
    console.log('🗑️ Decrypted data cleared from memory');
  }, []);

  return {
    decryptComplaint,
    decryptWithStoredKey,
    storePrivateKey,
    retrievePrivateKey,
    clearPrivateKey,
    verifyKeyPair,
    isDecrypting,
    decryptedData,
    error,
    resetState,
    clearDecryptedData,
  };
};
