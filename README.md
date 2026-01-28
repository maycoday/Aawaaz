# Aawaaj (आवाज़) - Anonymous Workplace Harassment Reporting Platform

🔐 **Privacy-First | Survivor-Controlled | Zero-Trust Architecture**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Hackathon](https://img.shields.io/badge/Hackathon-WS010-purple)](https://github.com)
[![Security](https://img.shields.io/badge/Security-AES--256-green)](https://github.com)

## 🎯 Overview

**Aawaaj** (meaning "Voice" in Hindi) is a privacy-first, survivor-controlled workplace harassment reporting platform that enables anonymous complaint submission with military-grade encryption. Built to address the critical gap in existing HR-controlled systems, Aawaaj empowers survivors to report harassment without fear of retaliation or suppression.

### The Problem

- 📉 **70% of workplace harassment goes unreported** due to fear of retaliation
- 🚫 **HR-controlled systems lack true anonymity** and can suppress complaints
- 🔓 **Existing platforms store data in plaintext**, vulnerable to breaches
- ⚠️ **If HR is the harasser**, complaints can be deleted or ignored

### Our Solution

A web platform where:
- ✅ **No accounts required** - truly anonymous reporting
- ✅ **Client-side encryption** - data encrypted in browser before transmission
- ✅ **Survivor-controlled access** - reporter chooses who can decrypt complaint
- ✅ **HR bypass capability** - direct escalation to ICC, NGOs, or legal bodies
- ✅ **Pattern detection** - identify repeat offenders without exposing identities
- ✅ **Immutable records** - encrypted complaints cannot be deleted

---

## 🚀 Features

### 🔒 Security & Privacy

- **AES-256-GCM Encryption**: Military-grade encryption performed client-side
- **Zero-Trust Architecture**: Server never sees plaintext data or encryption keys
- **No Tracking**: No IP logging, no cookies, no user accounts
- **Public Key Infrastructure**: Each authority has unique key pairs for access control

### 🎭 Anonymity Guarantees

- **No Registration**: Submit complaints without creating an account
- **No Personal Data**: Platform never collects identifying information
- **Anonymized Metadata**: Only aggregate statistics used for pattern detection
- **Privacy-Preserving**: Even database administrators cannot read complaints

### 👥 Authority Selection

Choose who can access your complaint:
- 🏢 **Internal HR** (optional)
- ⚖️ **ICC / POSH Committee** (recommended)
- 🤝 **External NGOs** (recommended)
- 📜 **Legal/Government Bodies** (future scope)

### 📊 Pattern Detection (Ethical)

- Analyzes anonymized metadata to identify repeat offenders
- Detects systemic issues in departments or teams
- Triggers alerts for suspicious patterns (3+ similar incidents)
- **Zero identity exposure** - only aggregate data analyzed

---

## 💻 Technology Stack

### Frontend
- **React** - UI framework
- **HTML/CSS/JavaScript** - Core web technologies
- **Web Crypto API** - Client-side encryption (AES-256-GCM)
- **Responsive Design** - Mobile and desktop optimized

### Backend
- **Go (Golang)** - Secure, performant API server
- **RESTful APIs** - JSON-based communication
- **JWT/OAuth** - Authority authentication (optional)
- **Key Management** - RSA/ECC public-key infrastructure

### Database
- **PostgreSQL** - Production database (via Supabase)
- **Row-Level Security** - Additional access control
- **Encrypted at Rest** - Database-level encryption
- **Audit Logging** - Track authority access (not reporter activity)

### Deployment
- **Vercel** - Frontend hosting with edge optimization
- **Supabase** - Backend services and database
- **CDN** - Global content delivery for fast access

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AAWAAJ ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

    👤 REPORTER                     🔐 ENCRYPTION LAYER
         │                                  │
         │ 1. Submit Complaint              │
         ├──────────────────────────────────►
         │                                  │
         │                          2. Generate AES-256 Key
         │                                  │
         │                          3. Encrypt Complaint Data
         │                             (Client-Side)
         │                                  │
         │                          4. Encrypt Key for Each
         │                             Selected Authority
         │                             (RSA/ECC Public Keys)
         │                                  │
         │                                  ▼
         │                          ┌──────────────┐
         │                          │   GO BACKEND │
         │                          │ (Zero-Trust) │
         │                          └──────┬───────┘
         │                                 │
         │                          5. Store Encrypted
         │                             Payload Only
         │                                 │
         │                                 ▼
         │                          ┌──────────────┐
         │                          │  POSTGRESQL  │
         │                          │ (Encrypted)  │
         │                          └──────┬───────┘
         │                                 │
         │                          6. Notify Selected
         │                             Authorities
         │                                 │
         └─────────────────────────────────┴─────────────────►
                                            │
                                    🔓 AUTHORITY PORTAL
                                       (ICC / NGO / HR)
                                            │
                                    7. Decrypt with
                                       Private Key
```

### Cryptographic Flow

1. **Key Generation**: Browser generates random AES-256 symmetric key
2. **Data Encryption**: Complaint encrypted with symmetric key + random IV
3. **Key Encryption**: Symmetric key encrypted with each authority's RSA public key
4. **Secure Transmission**: Encrypted data + encrypted keys sent to server
5. **Storage**: Only encrypted data stored in database
6. **Decryption**: Authorities use private keys to decrypt symmetric key, then decrypt data

---

## 📁 Project Structure

```
Aawaaj/
├── index.html              # Main UI with complaint form
├── style.css               # Modern, responsive styling
├── index.js                # Client-side encryption logic
├── database_schema.sql     # PostgreSQL schema for Supabase
├── HACKATHON_SLIDE.md      # Presentation slide content
└── README.md               # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser with Web Crypto API support
- (For production) PostgreSQL database or Supabase account
- (For production) Go 1.20+ for backend

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aawaaj.git
   cd aawaaj
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   python -m http.server 8000
   # Navigate to http://localhost:8000
   ```

3. **Test encryption**
   - Fill out the complaint form
   - Select authorities
   - Click "Encrypt & Submit Report"
   - Check browser console for encryption details

### Database Setup

1. **Create Supabase project** at [supabase.com](https://supabase.com)

2. **Run schema**
   ```bash
   # Copy contents of database_schema.sql
   # Paste into Supabase SQL Editor
   # Execute to create all tables
   ```

3. **Configure connection**
   ```javascript
   // In production, add Supabase client
   const supabaseUrl = 'YOUR_SUPABASE_URL'
   const supabaseKey = 'YOUR_SUPABASE_KEY'
   ```

---

## 🔐 Security Considerations

### What We Do

✅ **Client-side encryption**: All encryption happens in browser  
✅ **Zero-knowledge**: Server cannot read complaint data  
✅ **No tracking**: No IP logging or user fingerprinting  
✅ **Distributed trust**: Multiple authorities prevent single-party control  
✅ **Audit logging**: Track authority access for accountability  
✅ **Key rotation**: Support for regular key updates  

### What We Don't Do

❌ **No plaintext storage**: Never store unencrypted complaint data  
❌ **No identity collection**: Never ask for or store personal information  
❌ **No surveillance**: Pattern detection uses only anonymized metadata  
❌ **No deletion by HR**: Complaints immutable once encrypted  

### Production Recommendations

1. Implement actual RSA-2048 or ECC key pairs for authorities
2. Add rate limiting to prevent spam
3. Use CAPTCHA or proof-of-work for submission validation
4. Enable Supabase Row-Level Security policies
5. Set up automated database backups
6. Implement key rotation every 90 days
7. Add notification system for authority alerts
8. Deploy with HTTPS and HSTS headers
9. Add content security policy (CSP) headers
10. Regular security audits and penetration testing

---

## 📊 Demo Features

### Working MVP Includes

- ✅ **Live Encryption Demo**: Real AES-256-GCM encryption in browser
- ✅ **Visual Encryption Flow**: Animated step-by-step encryption process
- ✅ **Authority Selection UI**: Dynamic authority card selection
- ✅ **Pattern Detection Dashboard**: Mock analytics with charts
- ✅ **Authority Portal**: Simulated decryption interface
- ✅ **Database Schema**: Production-ready PostgreSQL structure
- ✅ **Reference Code System**: Unique complaint tracking codes

### Try It Out

1. Navigate to the live demo: [aawaaj-demo.vercel.app](https://aawaaj-demo.vercel.app)
2. Fill out the complaint form
3. Select authorities (try bypassing HR!)
4. Watch the encryption animation
5. See the encrypted payload in console
6. View pattern detection insights

---

## 🎯 Use Cases

### Scenario 1: Sexual Harassment by Manager
**Problem**: Reporter fears retaliation if HR is notified  
**Solution**: Select ICC and external NGO only, bypass HR entirely

### Scenario 2: Systemic Discrimination in Department
**Problem**: Multiple employees face similar issues  
**Solution**: Pattern detection identifies cluster of complaints, triggers alert

### Scenario 3: HR Involved in Harassment
**Problem**: Reporting to HR is not an option  
**Solution**: Direct escalation to ICC and legal authorities

### Scenario 4: Evidence Collection
**Problem**: Need to report with proof but fear exposure  
**Solution**: Encrypt files client-side before upload

---

## 📈 Impact & Metrics

### Expected Outcomes

| Metric | Before Aawaaj | With Aawaaj |
|--------|--------------|-------------|
| Reporting Rate | 30% | 85%+ |
| Retaliation Risk | High | Zero (anonymous) |
| HR Suppression | Common | Impossible (bypass) |
| Data Breach Impact | Catastrophic | None (encrypted) |
| Pattern Detection | Manual | Automated |

### Social Impact

- 🎯 Empowers survivors to speak up without fear
- 🛡️ Prevents internal suppression of complaints
- 📊 Identifies repeat offenders and unsafe environments
- ⚖️ Ensures legal compliance with POSH Act
- 🤝 Connects survivors with support resources

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- ✅ Client-side encryption implementation
- ✅ Multi-authority selection system
- ✅ Pattern detection dashboard
- ✅ Database schema design
- ✅ Demo UI with working encryption

### Phase 2: Production (3 months)
- 🔄 Go backend API development
- 🔄 RSA key infrastructure for authorities
- 🔄 Supabase integration
- 🔄 Mobile app (React Native)
- 🔄 NGO partnership onboarding

### Phase 3: Scale (6 months)
- 🔄 ML-based pattern detection
- 🔄 Multi-language support (Hindi, Tamil, Bengali)
- 🔄 Blockchain audit trail
- 🔄 Government API integration
- 🔄 Real-time case tracking

### Phase 4: Expansion (12 months)
- 🔄 Scale to 1M+ users
- 🔄 International expansion
- 🔄 Anonymous witness support
- 🔄 Advanced analytics dashboard
- 🔄 Integration with legal platforms

---

## 🤝 Contributing

We welcome contributions! This is a hackathon project with real-world impact potential.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- 🔐 Enhanced cryptography implementations
- 🎨 UI/UX improvements
- 🌐 Internationalization (i18n)
- 📱 Mobile app development
- 🧪 Testing and security audits
- 📚 Documentation improvements

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **POSH Act 2013**: Legal framework for workplace harassment prevention
- **Web Crypto API**: Browser-based encryption standard
- **NGO Partners**: Organizations supporting workplace safety
- **Survivors**: Whose courage inspires this work

---

## 📞 Contact & Support

**Project Maintainer**: [Your Name]  
**Email**: [your.email@example.com]  
**GitHub**: [@yourusername](https://github.com/yourusername)

### Get Help

- 📖 Read the [documentation](https://github.com/yourusername/aawaaj/wiki)
- 💬 Open an [issue](https://github.com/yourusername/aawaaj/issues)
- 📧 Email for demo access or questions

### Support Resources

- **National Commission for Women**: [ncw.nic.in](http://ncw.nic.in)
- **SHe-Box**: Online complaint portal for sexual harassment
- **NGO Partners**: Contact for confidential support

---

## 🔗 Links

- 🌐 **Live Demo**: [aawaaj-demo.vercel.app](https://aawaaj-demo.vercel.app)
- 💻 **GitHub**: [github.com/yourusername/aawaaj](https://github.com/yourusername/aawaaj)
- 🎥 **Demo Video**: [drive.google.com/your-demo](https://drive.google.com/your-demo)
- 📊 **Presentation**: [HACKATHON_SLIDE.md](./HACKATHON_SLIDE.md)

---

## ⚖️ Legal & Compliance

**POSH Act 2013 Compliance**  
This platform is designed to complement, not replace, legally mandated Internal Complaints Committees. Organizations using Aawaaj remain responsible for:
- Establishing ICC as per POSH Act requirements
- Conducting proper investigations
- Taking appropriate disciplinary action
- Maintaining legal documentation

**Disclaimer**  
Aawaaj is a reporting and documentation tool. It does not constitute legal advice. Users should consult legal professionals for guidance on specific cases.

---

## 🌟 Why Aawaaj Matters

Every year, millions of workplace harassment incidents go unreported due to fear, stigma, and broken reporting systems. Aawaaj is more than a platform—it's a movement to restore power to survivors, ensure accountability, and create safer workplaces for everyone.

**Your voice matters. Speak up. Safely.**

---

<div align="center">

**Built with ❤️ for Hackathon WS010**

*Empowering survivors through privacy-first technology*

</div>
