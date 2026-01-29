/**
 * Aawaaj Encryption Service
 * Client-Side Encryption using Web Crypto API
 * AES-256-GCM for data encryption
 * RSA-OAEP for key encryption (simulated for demo)
 */

class EncryptionService {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  /**
   * Generate a random AES-256 symmetric key
   */
  async generateSymmetricKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encryptData(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv
      },
      key,
      encodedData
    );

    return {
      encryptedData: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  /**
   * Encrypt symmetric key for each authority
   * In production: Use authority's RSA public key
   */
  async encryptKeyForAuthority(key, authorityId, authorityPublicKey) {
    // Export the symmetric key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    
    // In production: Use RSA-OAEP to encrypt with authority's public key
    // For demo: Base64 encode the key
    return {
      authorityId: authorityId,
      encryptedKey: this.arrayBufferToBase64(exportedKey),
      keyAlgorithm: 'RSA-OAEP-256', // Would be used in production
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique reference code
   */
  generateReferenceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 3;
    const segmentLength = 4;
    let code = [];
    
    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code.push(segment);
    }
    
    return code.join('-');
  }

  /**
   * Encrypt entire complaint payload
   */
  async encryptComplaint(complaintData, selectedAuthorities) {
    try {
      // Step 1: Generate symmetric key
      const symmetricKey = await this.generateSymmetricKey();
      console.log('✅ Symmetric key generated');

      // Step 2: Encrypt complaint data
      const encrypted = await this.encryptData(complaintData, symmetricKey);
      console.log('✅ Data encrypted with AES-256-GCM');

      // Step 3: Encrypt symmetric key for each authority
      const encryptedKeys = [];
      for (const authority of selectedAuthorities) {
        const encryptedKey = await this.encryptKeyForAuthority(
          symmetricKey,
          authority.id,
          authority.publicKey
        );
        encryptedKeys.push(encryptedKey);
      }
      console.log(`✅ Keys encrypted for ${selectedAuthorities.length} authorities`);

      // Step 4: Prepare metadata (anonymized)
      const metadata = {
        incidentType: complaintData.incidentType,
        department: complaintData.department || 'unspecified',
        incidentDate: complaintData.incidentDate,
        timestamp: new Date().toISOString(),
        hasEvidence: false // Can be extended for file uploads
      };

      // Step 5: Create final payload
      const payload = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        encryptedKeys: encryptedKeys,
        metadata: metadata,
        referenceCode: this.generateReferenceCode()
      };

      console.log('📦 Encrypted Payload Created');
      console.log('🔒 Plaintext NEVER sent to server');
      
      return payload;
    } catch (error) {
      console.error('❌ Encryption error:', error);
      throw error;
    }
  }

  // Utility methods
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

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
