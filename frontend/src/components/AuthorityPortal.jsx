import React from 'react';

function AuthorityPortal() {
  return (
    <section id="authorities" className="authority-portal">
      <h2>For Authorized Entities</h2>
      <div className="portal-demo">
        <div className="portal-card">
          <h3>🔐 Authority Access Portal</h3>
          <p>ICC, NGO, and authorized entities can access complaints encrypted specifically for them.</p>
          <div className="demo-login">
            <input type="text" placeholder="Authority Public Key ID" readOnly value="ICC_KEY_2026_01" />
            <button className="btn-secondary">Decrypt Assigned Complaints</button>
          </div>
          <div className="access-info">
            <small>✅ Only authorities selected by reporter can decrypt</small>
            <small>✅ Requires private key possession</small>
            <small>✅ Access logs maintained for accountability</small>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuthorityPortal;
