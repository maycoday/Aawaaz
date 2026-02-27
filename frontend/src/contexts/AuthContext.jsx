import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [authority, setAuthority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  // Session timeout: 30 minutes
  const SESSION_DURATION = 30 * 60 * 1000;

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('authority_token');
    const authorityData = localStorage.getItem('authority_data');
    const loginTime = localStorage.getItem('authority_login_time');

    if (token && authorityData && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      
      if (elapsed < SESSION_DURATION) {
        setAuthority(JSON.parse(authorityData));
        startSessionTimeout(SESSION_DURATION - elapsed);
      } else {
        // Session expired
        logout();
      }
    }
    
    setLoading(false);
  }, []);

  const startSessionTimeout = (duration) => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const timeout = setTimeout(() => {
      alert('Session expired. Please login again.');
      logout();
    }, duration);

    setSessionTimeout(timeout);
  };

  const login = (token, authorityData) => {
    localStorage.setItem('authority_token', token);
    localStorage.setItem('authority_data', JSON.stringify(authorityData));
    localStorage.setItem('authority_login_time', Date.now().toString());
    
    setAuthority(authorityData);
    startSessionTimeout(SESSION_DURATION);
  };

  const logout = () => {
    // Clear all sensitive data
    localStorage.removeItem('authority_token');
    localStorage.removeItem('authority_data');
    localStorage.removeItem('authority_login_time');
    
    // Clear IndexedDB private keys
    if (window.indexedDB) {
      const request = indexedDB.deleteDatabase('AuthorityKeys');
      request.onsuccess = () => console.log('Private keys cleared');
    }
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    setAuthority(null);
    setSessionTimeout(null);
  };

  const getToken = () => {
    return localStorage.getItem('authority_token');
  };

  const refreshSession = () => {
    localStorage.setItem('authority_login_time', Date.now().toString());
    startSessionTimeout(SESSION_DURATION);
  };

  const value = {
    authority,
    login,
    logout,
    getToken,
    refreshSession,
    isAuthenticated: !!authority,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
