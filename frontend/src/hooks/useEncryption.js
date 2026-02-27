import { useState, useCallback } from 'react';
import encryptionService from '../services/encryption';

/**
 * useEncryption Hook
 * 
 * Custom hook for handling complaint encryption operations.
 * Wraps the encryption service with React state management.
 * 
 * @returns {Object} Encryption utilities and state
 * @returns {Function} encryptComplaint - Encrypts complaint data for authorities
 * @returns {Function} decryptComplaint - Decrypts complaint data with private key
 * @returns {boolean} isEncrypting - Loading state during encryption
 * @returns {string|null} error - Error message if encryption fails
 * 
 * @example
 * const { encryptComplaint, isEncrypting, error } = useEncryption();
 * 
 * const handleEncrypt = async () => {
 *   const encrypted = await encryptComplaint(complaintData, authorities);
 *   if (encrypted) {
 *     console.log('Encrypted payload:', encrypted);
 *   }
 * };
 */
export const useEncryption = () => {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Encrypt complaint data for multiple authorities
   * 
   * @param {Object} complaintData - Raw complaint data to encrypt
   * @param {Array} authorities - List of authorities with public keys
   * @returns {Promise<Object|null>} Encrypted payload or null on error
   */
  const encryptComplaint = useCallback(async (complaintData, authorities) => {
    setIsEncrypting(true);
    setError(null);

    try {
      // Validate inputs
      if (!complaintData || typeof complaintData !== 'object') {
        throw new Error('Invalid complaint data');
      }

      if (!authorities || !Array.isArray(authorities) || authorities.length === 0) {
        throw new Error('At least one authority must be selected');
      }

      // Verify authorities have public keys
      const invalidAuthorities = authorities.filter(auth => !auth.publicKey);
      if (invalidAuthorities.length > 0) {
        throw new Error('Some authorities are missing public keys');
      }

      // Encrypt using encryption service
      const encryptedPayload = await encryptionService.encryptComplaint(
        complaintData,
        authorities
      );

      setIsEncrypting(false);
      return encryptedPayload;

    } catch (err) {
      console.error('🔐 Encryption error:', err);
      setError(err.message || 'Failed to encrypt complaint');
      setIsEncrypting(false);
      return null;
    }
  }, []);

  /**
   * Decrypt complaint data using authority's private key
   * 
   * @param {Object} encryptedPayload - Encrypted complaint data
   * @param {string} privateKeyPEM - Authority's RSA private key (PEM format)
   * @returns {Promise<Object|null>} Decrypted complaint data or null on error
   */
  const decryptComplaint = useCallback(async (encryptedPayload, privateKeyPEM) => {
    setIsEncrypting(true); // Reuse same loading state
    setError(null);

    try {
      // Validate inputs
      if (!encryptedPayload) {
        throw new Error('No encrypted payload provided');
      }

      if (!privateKeyPEM || typeof privateKeyPEM !== 'string') {
        throw new Error('Invalid private key');
      }

      // Extract encrypted data and key
      const {
        encryptedData,
        iv,
        encryptedAESKey,
      } = encryptedPayload;

      if (!encryptedData || !iv || !encryptedAESKey) {
        throw new Error('Incomplete encrypted payload');
      }

      // Decrypt using encryption service
      const decryptedData = await encryptionService.decryptComplaintWithPrivateKey(
        encryptedData,
        iv,
        encryptedAESKey,
        privateKeyPEM
      );

      setIsEncrypting(false);
      return decryptedData;

    } catch (err) {
      console.error('🔓 Decryption error:', err);
      setError(err.message || 'Failed to decrypt complaint');
      setIsEncrypting(false);
      return null;
    }
  }, []);

  return {
    encryptComplaint,
    decryptComplaint,
    isEncrypting,
    error,
  };
};
