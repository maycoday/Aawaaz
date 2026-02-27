import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import '../styles/AuthorityLogin.css';

const AuthorityLogin = () => {
  const [formData, setFormData] = useState({
    identifier: '', // email or authority ID
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/authority/dashboard';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call login API
      const response = await apiService.authorityLogin({
        identifier: formData.identifier,
        password: formData.password
      });

      if (response.success) {
        // Store token and authority data
        login(response.token, response.authority);
        
        // Navigate to dashboard
        navigate(from, { replace: true });
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authority-login-container">
      <div className="authority-login-card">
        <div className="authority-login-header">
          <div className="authority-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V11C2 16.55 5.84 21.74 12 23C18.16 21.74 22 16.55 22 11V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>Authority Portal</h1>
          <p>Secure access to complaint management</p>
        </div>

        <form onSubmit={handleSubmit} className="authority-login-form">
          {error && (
            <div className="authority-login-error">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <div className="authority-form-group">
            <label htmlFor="identifier">Authority ID / Email</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="auth-hr-001 or email@example.com"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="authority-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="authority-login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="authority-login-spinner"></span>
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="authority-login-footer">
          <div className="authority-security-notice">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="8" r="1" fill="currentColor"/>
            </svg>
            <div>
              <strong>Security Notice:</strong>
              <p>Your session will expire after 30 minutes of inactivity. Never share your credentials or private key.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="authority-login-background">
        <div className="authority-login-bg-pattern"></div>
      </div>
    </div>
  );
};

export default AuthorityLogin;
