/**
 * Aawaaj Encryption Service
 * Production-Ready Client-Side Encryption using Web Crypto API
 * 
 * Features:
 * - AES-256-GCM for symmetric data encryption
 * - RSA-OAEP with SHA-256 for asymmetric key encryption
 * - Zero-knowledge architecture (server never sees plaintext)
 * - Department anonymization via SHA-256 hashing
 * - Full PEM key import/export support
 * 
 * @author Aawaaj Security Team
 * @version 2.0.0
 */

class EncryptionService {
  constructor() {
    // AES configuration for data encryption
    this.aesAlgorithm = 'AES-GCM';
    this.aesKeyLength = 256;
    this.ivLength = 12; // 96 bits recommended for GCM
    
    // RSA configuration for key encryption
    this.rsaAlgorithm = 'RSA-OAEP';
    this.rsaHash = 'SHA-256';
    this.rsaModulusLength = 2048;
  }

  /**
   * Generate a new AES-256-GCM symmetric encryption key
   * Used to encrypt complaint data before transmission
   * 
   * @returns {Promise<CryptoKey>} AES-256-GCM key object
   * @throws {Error} If key generation fails
   */
  async generateAESKey() {
    try {
      return await crypto.subtle.generateKey(
        {
          name: this.aesAlgorithm,
          length: this.aesKeyLength
        },
        true, // extractable - needed to encrypt key for authorities
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('❌ AES key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Encrypt data using AES-256-GCM with a random IV
   * Returns base64-encoded ciphertext with IV prepended
   * 
   * @param {Object} data - JSON object to encrypt
   * @param {CryptoKey} aesKey - AES-256-GCM key
   * @returns {Promise<string>} Base64 string: IV (12 bytes) + encrypted data
   * @throws {Error} If encryption fails
   */
  async encryptData(data, aesKey) {
    try {
      // Convert data to UTF-8 bytes
      const encoder = new TextEncoder();
      const jsonString = JSON.stringify(data);
      const plaintextBytes = encoder.encode(jsonString);
      
      // Generate cryptographically secure random IV (96 bits for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      // Encrypt with AES-256-GCM
      // GCM provides both confidentiality and authenticity
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: this.aesAlgorithm,
          iv: iv,
          tagLength: 128 // 128-bit authentication tag
        },
        aesKey,
        plaintextBytes
      );

      // Combine IV + ciphertext and encode as base64
      // Format: [12-byte IV][ciphertext][16-byte auth tag]
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('❌ Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   * Expects base64 string with IV prepended
   * 
   * @param {string} encryptedBase64 - Base64 encoded IV + ciphertext
   * @param {CryptoKey} aesKey - AES-256-GCM key used for encryption
   * @returns {Promise<Object>} Decrypted JSON object
   * @throws {Error} If decryption or authentication fails
   */
  async decryptData(encryptedBase64, aesKey) {
    try {
      // Decode base64 to bytes
      const combined = new Uint8Array(this.base64ToArrayBuffer(encryptedBase64));
      
      // Extract IV (first 12 bytes) and ciphertext (remaining bytes)
      const iv = combined.slice(0, this.ivLength);
      const ciphertext = combined.slice(this.ivLength);
      
      // Decrypt with AES-256-GCM
      // Will throw if authentication tag verification fails
      const plaintextBytes = await crypto.subtle.decrypt(
        {
          name: this.aesAlgorithm,
          iv: iv,
          tagLength: 128
        },
        aesKey,
        ciphertext
      );

      // Convert bytes back to JSON object
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(plaintextBytes);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('❌ Data decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
  }

  /**
   * Encrypt AES key using authority's RSA public key
   * Enables selective decryption - only the authority can decrypt their copy
   * 
   * @param {CryptoKey} aesKey - AES-256-GCM key to encrypt
   * @param {string} authorityPublicKeyPEM - RSA public key in PEM format
   * @returns {Promise<string>} Base64-encoded encrypted AES key
   * @throws {Error} If key encryption fails
   */
  async encryptAESKeyForAuthority(aesKey, authorityPublicKeyPEM) {
    try {
      // Export AES key as raw bytes
      const aesKeyBytes = await crypto.subtle.exportKey('raw', aesKey);
      
      // Import authority's RSA public key from PEM
      const publicKey = await this.importRSAPublicKey(authorityPublicKeyPEM);
      
      // Encrypt AES key with RSA-OAEP
      // Only the holder of the private key can decrypt this
      const encryptedKey = await crypto.subtle.encrypt(
        {
          name: this.rsaAlgorithm
        },
        publicKey,
        aesKeyBytes
      );
      
      return this.arrayBufferToBase64(encryptedKey);
    } catch (error) {
      console.error('❌ AES key encryption failed:', error);
      throw new Error('Failed to encrypt key for authority');
    }
  }

  /**
   * Decrypt AES key using authority's RSA private key
   * Used by authorities to access their assigned complaints
   * 
   * @param {string} encryptedAESKeyBase64 - Base64-encoded encrypted AES key
   * @param {string} privateKeyPEM - RSA private key in PEM format
   * @returns {Promise<CryptoKey>} Decrypted AES-256-GCM key
   * @throws {Error} If key decryption fails
   */
  async decryptAESKeyWithPrivateKey(encryptedAESKeyBase64, privateKeyPEM) {
    try {
      // Decode encrypted key from base64
      const encryptedKeyBytes = this.base64ToArrayBuffer(encryptedAESKeyBase64);
      
      // Import authority's RSA private key from PEM
      const privateKey = await this.importRSAPrivateKey(privateKeyPEM);
      
      // Decrypt with RSA-OAEP to get raw AES key bytes
      const aesKeyBytes = await crypto.subtle.decrypt(
        {
          name: this.rsaAlgorithm
        },
        privateKey,
        encryptedKeyBytes
      );
      
      // Import raw bytes as AES key
      return await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        {
          name: this.aesAlgorithm,
          length: this.aesKeyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('❌ AES key decryption failed:', error);
      throw new Error('Failed to decrypt AES key - invalid private key');
    }
  }

  /**
   * Hash department name for anonymization
   * Enables pattern detection without revealing actual department
   * 
   * @param {string} department - Department name to anonymize
   * @returns {Promise<string>} SHA-256 hash as hex string
   * @throws {Error} If hashing fails
   */
  async hashDepartment(department) {
    try {
      // Convert department name to bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(department.toLowerCase().trim());
      
      // Compute SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('❌ Department hashing failed:', error);
      throw new Error('Failed to hash department');
    }
  }

  /**
   * Import RSA public key from PEM format
   * 
   * @param {string} pemKey - RSA public key in PEM format
   * @returns {Promise<CryptoKey>} Imported public key object
   * @throws {Error} If import fails
   */
  async importRSAPublicKey(pemKey) {
    try {
      // Remove PEM headers and decode base64
      const pemContents = pemKey
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');
      const binaryDer = this.base64ToArrayBuffer(pemContents);
      
      // Import as RSA-OAEP public key
      return await crypto.subtle.importKey(
        'spki', // SubjectPublicKeyInfo format
        binaryDer,
        {
          name: this.rsaAlgorithm,
          hash: this.rsaHash
        },
        true,
        ['encrypt'] // Public keys can only encrypt
      );
    } catch (error) {
      console.error('❌ RSA public key import failed:', error);
      throw new Error('Invalid RSA public key format');
    }
  }

  /**
   * Import RSA private key from PEM format
   * 
   * @param {string} pemKey - RSA private key in PEM format
   * @returns {Promise<CryptoKey>} Imported private key object
   * @throws {Error} If import fails
   */
  async importRSAPrivateKey(pemKey) {
    try {
      // Remove PEM headers and decode base64
      const pemContents = pemKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
        .replace(/-----END RSA PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
      const binaryDer = this.base64ToArrayBuffer(pemContents);
      
      // Import as RSA-OAEP private key
      return await crypto.subtle.importKey(
        'pkcs8', // PrivateKeyInfo format
        binaryDer,
        {
          name: this.rsaAlgorithm,
          hash: this.rsaHash
        },
        true,
        ['decrypt'] // Private keys can only decrypt
      );
    } catch (error) {
      console.error('❌ RSA private key import failed:', error);
      throw new Error('Invalid RSA private key format');
    }
  }

  /**
   * Generate unique reference code for complaint tracking
   * Format: XXXX-XXXX-XXXX (12 alphanumeric characters)
   * 
   * @returns {string} Reference code
   */
  generateReferenceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 3;
    const segmentLength = 4;
    const code = [];
    
    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        segment += chars.charAt(randomIndex);
      }
      code.push(segment);
    }
    
    return code.join('-');
  }

  /**
   * Encrypt entire complaint with multi-authority access control
   * Main workflow for submitting encrypted reports
   * 
   * @param {Object} complaintData - Complaint details to encrypt
   * @param {Array} selectedAuthorities - Array of {id, publicKey} objects
   * @returns {Promise<Object>} Encrypted payload ready for submission
   * @throws {Error} If encryption workflow fails
   */
  async encryptComplaint(complaintData, selectedAuthorities) {
    try {
      // Step 1: Generate fresh symmetric key for this complaint
      const aesKey = await this.generateAESKey();
      console.log('✅ AES-256 symmetric key generated');

      // Step 2: Encrypt complaint data with AES-GCM
      const encryptedData = await this.encryptData(complaintData, aesKey);
      console.log('✅ Data encrypted with AES-256-GCM');

      // Step 3: Encrypt AES key for each selected authority
      // Each authority gets their own encrypted copy of the key
      const encryptedKeys = [];
      for (const authority of selectedAuthorities) {
        try {
          const encryptedKey = await this.encryptAESKeyForAuthority(
            aesKey,
            authority.publicKey
          );
          encryptedKeys.push({
            authorityId: authority.id,
            encryptedKey: encryptedKey,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.warn(`⚠️ Failed to encrypt key for authority ${authority.id}:`, error);
          // Continue with other authorities
        }
      }
      
      if (encryptedKeys.length === 0) {
        throw new Error('Failed to encrypt key for any authority');
      }
      
      console.log(`✅ Keys encrypted for ${encryptedKeys.length} authorities`);

      // Step 4: Hash department for anonymous pattern detection
      const departmentHash = complaintData.department 
        ? await this.hashDepartment(complaintData.department)
        : null;

      // Step 5: Prepare anonymized metadata (no PII)
      const metadata = {
        incidentType: complaintData.incidentType,
        departmentHash: departmentHash,
        incidentDate: complaintData.incidentDate,
        timestamp: new Date().toISOString(),
        hasEvidence: complaintData.evidence ? true : false,
        encryptionVersion: '2.0'
      };

      // Step 6: Assemble final encrypted payload
      const payload = {
        encryptedData: encryptedData,
        encryptedKeys: encryptedKeys,
        metadata: metadata,
        referenceCode: this.generateReferenceCode()
      };

      console.log('📦 Encrypted Payload Assembled');
      console.log('🔒 Zero-knowledge: Server never sees plaintext');
      console.log(`🔑 Reference Code: ${payload.referenceCode}`);
      
      return payload;
    } catch (error) {
      console.error('❌ Complaint encryption failed:', error);
      throw new Error('Failed to encrypt complaint: ' + error.message);
    }
  }

  /**
   * Decrypt complaint using authority's private key
   * High-level method that combines AES key decryption and data decryption
   * 
   * @param {string} encryptedData - Base64 encoded encrypted complaint data
   * @param {string} iv - Base64 encoded initialization vector
   * @param {string} encryptedAESKey - Base64 encoded encrypted AES key
   * @param {string} privateKeyPEM - Authority's RSA private key (PEM format)
   * @returns {Promise<Object>} Decrypted complaint data
   * @throws {Error} If decryption fails
   */
  async decryptComplaintWithPrivateKey(encryptedData, iv, encryptedAESKey, privateKeyPEM) {
    try {
      console.log('🔓 Starting complaint decryption...');
      
      // Step 1: Decrypt AES key using private key
      const aesKey = await this.decryptAESKeyWithPrivateKey(encryptedAESKey, privateKeyPEM);
      console.log('✅ AES key decrypted');
      
      // Step 2: Combine IV and encrypted data (format expected by decryptData)
      const ivBytes = this.base64ToArrayBuffer(iv);
      const encryptedBytes = this.base64ToArrayBuffer(encryptedData);
      
      // Combine IV and ciphertext
      const combined = new Uint8Array(ivBytes.byteLength + encryptedBytes.byteLength);
      combined.set(new Uint8Array(ivBytes), 0);
      combined.set(new Uint8Array(encryptedBytes), ivBytes.byteLength);
      
      // Encode back to base64 for decryptData method
      const combinedBase64 = this.arrayBufferToBase64(combined);
      
      // Step 3: Decrypt data using AES key
      const decryptedData = await this.decryptData(combinedBase64, aesKey);
      console.log('✅ Complaint data decrypted successfully');
      
      return decryptedData;
      
    } catch (error) {
      console.error('❌ Complaint decryption failed:', error);
      throw new Error('Failed to decrypt complaint: ' + error.message);
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * Used for encoding binary crypto data for transmission
   * 
   * @param {ArrayBuffer} buffer - Binary data to encode
   * @returns {string} Base64-encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * Used for decoding binary crypto data from transmission
   * 
   * @param {string} base64 - Base64-encoded string
   * @returns {ArrayBuffer} Binary data
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default new EncryptionService();
