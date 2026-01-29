import React from 'react';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="container">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L4 8V16C4 23 9 28 16 30C23 28 28 23 28 16V8L16 2Z" fill="#6366f1" stroke="#6366f1" strokeWidth="2"/>
            <path d="M12 16L15 19L20 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Aawaaj</span>
        </div>
        <div className="nav-links">
          <a href="#report" className="active">Report</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#authorities">For Authorities</a>
          <a href="#patterns">Pattern Insights</a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
