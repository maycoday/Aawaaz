import React from 'react';

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1>Your Voice. <span className="gradient-text">Your Control.</span></h1>
          <p className="hero-subtitle">
            Report workplace harassment anonymously with military-grade encryption. 
            No accounts. No tracking. Complete privacy.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">Anonymous</div>
            </div>
            <div className="stat">
              <div className="stat-value">AES-256</div>
              <div className="stat-label">Encryption</div>
            </div>
            <div className="stat">
              <div className="stat-value">Zero</div>
              <div className="stat-label">Tracking</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
