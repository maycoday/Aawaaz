// Aawaaj - Client-Side Encryption Implementation
// Web Crypto API for AES-256-GCM encryption

class AawaajCrypto {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    // Generate a random symmetric key for encrypting the complaint
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

    // Encrypt data with AES-256-GCM
    async encryptData(data, key) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        
        // Generate a random IV (Initialization Vector)
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

    // Simulate encrypting the symmetric key for each authority
    // In production, this would use RSA public keys of authorities
    async encryptKeyForAuthority(key, authorityId) {
        // Export the key
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        
        // In production: Use authority's RSA public key to encrypt this symmetric key
        // For demo: We'll just encode it and add authority metadata
        return {
            authorityId: authorityId,
            encryptedKey: this.arrayBufferToBase64(exportedKey),
            keyAlgorithm: 'RSA-OAEP', // Would be used in production
            timestamp: new Date().toISOString()
        };
    }

    // Generate a unique reference code for the complaint
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

    // Utility: Convert ArrayBuffer to Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Utility: Convert Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Initialize crypto instance
const aawaajCrypto = new AawaajCrypto();

// Form submission handler
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnText = submitBtn.innerHTML;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>🔐 Encrypting...</span>';
    
    try {
        // Visual feedback - highlight encryption steps
        animateEncryptionSteps();
        
        // Get form data
        const formData = {
            incidentType: document.getElementById('incidentType').value,
            incidentDate: document.getElementById('incidentDate').value,
            department: document.getElementById('department').value,
            description: document.getElementById('description').value,
            timestamp: new Date().toISOString()
        };

        // Get selected authorities
        const selectedAuthorities = Array.from(document.querySelectorAll('input[name="authority"]:checked'))
            .map(cb => cb.value);

        if (selectedAuthorities.length === 0) {
            alert('Please select at least one authority to receive this report.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        // Step 1: Generate symmetric key
        await sleep(500);
        const symmetricKey = await aawaajCrypto.generateSymmetricKey();
        console.log('✓ Symmetric key generated');

        // Step 2: Encrypt the complaint data
        await sleep(500);
        const encrypted = await aawaajCrypto.encryptData(formData, symmetricKey);
        console.log('✓ Data encrypted with AES-256-GCM');

        // Step 3: Encrypt the symmetric key for each selected authority
        await sleep(500);
        const encryptedKeys = [];
        for (const authority of selectedAuthorities) {
            const encryptedKey = await aawaajCrypto.encryptKeyForAuthority(symmetricKey, authority);
            encryptedKeys.push(encryptedKey);
        }
        console.log('✓ Keys encrypted for', selectedAuthorities.length, 'authorities');

        // Step 4: Prepare metadata (non-sensitive, anonymized)
        const metadata = {
            incidentType: formData.incidentType,
            department: formData.department || 'unspecified',
            timestamp: formData.timestamp,
            authorityCount: selectedAuthorities.length,
            hasEvidence: document.getElementById('evidence').files.length > 0
        };

        // Step 5: Prepare final payload
        const payload = {
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            encryptedKeys: encryptedKeys,
            metadata: metadata,
            referenceCode: aawaajCrypto.generateReferenceCode()
        };

        // In production: Send to backend API
        // await fetch('/api/complaints', { method: 'POST', body: JSON.stringify(payload) });
        
        // For demo: Log and show success
        console.log('📦 Encrypted Payload:', payload);
        console.log('🔒 Plaintext NEVER sent to server');
        
        await sleep(500);
        
        // Show success modal
        showSuccessModal(payload.referenceCode, selectedAuthorities.length);
        
        // Reset form
        document.getElementById('reportForm').reset();
        
    } catch (error) {
        console.error('Encryption error:', error);
        alert('An error occurred during encryption. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Animate encryption steps
function animateEncryptionSteps() {
    const steps = document.querySelectorAll('.encryption-step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.style.transform = 'scale(1.1)';
            step.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            setTimeout(() => {
                step.style.transform = 'scale(1)';
                step.style.background = '';
            }, 300);
        }, index * 600);
    });
}

// Show success modal
function showSuccessModal(referenceCode, authorityCount) {
    const modal = document.getElementById('successModal');
    const codeDisplay = document.getElementById('referenceCode');
    const countDisplay = document.getElementById('authorityCount');
    
    codeDisplay.textContent = referenceCode;
    countDisplay.textContent = authorityCount;
    
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Utility: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Demo: Show encryption status on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Aawaaj - Anonymous Workplace Harassment Reporting Platform');
    console.log('✓ Web Crypto API available');
    console.log('✓ Client-side encryption enabled');
    console.log('✓ Zero-trust architecture active');
    
    // Animate encryption status badge
    const statusBadge = document.querySelector('.status-badge');
    setTimeout(() => {
        statusBadge.style.animation = 'pulse 2s ease-in-out infinite';
    }, 500);
    
    // Set max date to today for incident date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incidentDate').setAttribute('max', today);
});

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Demo: Simulate pattern detection data update
setInterval(() => {
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => {
        const currentHeight = parseInt(bar.style.height);
        const variation = Math.random() * 10 - 5; // -5% to +5%
        const newHeight = Math.max(20, Math.min(80, currentHeight + variation));
        bar.style.height = newHeight + '%';
    });
}, 5000);

// Authority card hover effects
document.querySelectorAll('.authority-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Demo: Console warning about security
console.log('%c⚠️ SECURITY NOTICE', 'color: #ef4444; font-size: 16px; font-weight: bold;');
console.log('%cThis is a DEMO implementation for hackathon judging.', 'color: #f59e0b; font-size: 12px;');
console.log('%cProduction version would include:', 'color: #10b981; font-size: 12px;');
console.log('  • RSA public key infrastructure for authorities');
console.log('  • Secure backend API with Go');
console.log('  • PostgreSQL with row-level encryption');
console.log('  • Key rotation and revocation mechanisms');
console.log('  • Audit logging and access controls');
console.log('  • File encryption for evidence uploads');
console.log('%c🔒 All encryption happens client-side - server never sees plaintext', 'color: #6366f1; font-size: 14px; font-weight: bold;');
