import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Aawaaj</h4>
            <p>Anonymous workplace harassment reporting platform built for survivors.</p>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="#">POSH Act Information</a>
            <a href="#">NGO Partners</a>
            <a href="#">Legal Support</a>
          </div>
          <div className="footer-section">
            <h4>Project Links</h4>
            <a href="https://github.com/yourusername/aawaaj" target="_blank" rel="noopener noreferrer">🔗 GitHub Repository</a>
            <a href="https://drive.google.com/your-demo" target="_blank" rel="noopener noreferrer">🎥 Demo Video</a>
            <a href="#" target="_blank" rel="noopener noreferrer">📊 Presentation</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>🔒 Built with privacy-first principles | WS010 Hackathon Project 2026</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
