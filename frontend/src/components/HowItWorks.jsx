import React from 'react';

function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works">
      <h2>How Aawaaj Protects You</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Client-Side Encryption</h3>
          <p>Your complaint is encrypted in your browser using AES-256 before transmission. We never see plaintext data.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎭</div>
          <h3>True Anonymity</h3>
          <p>No accounts, no login, no IP logging. Your identity remains completely private.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">👤</div>
          <h3>You Choose Authorities</h3>
          <p>Select who can access your report. Bypass HR if needed. You're in control.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>Zero-Trust Architecture</h3>
          <p>Even our servers can't decrypt your data. Only selected authorities with private keys can access it.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Pattern Detection</h3>
          <p>Identify repeat offenders through anonymized metadata analysis without exposing reporters.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚖️</div>
          <h3>POSH Compliant</h3>
          <p>Aligned with legal requirements while prioritizing survivor safety and privacy.</p>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
