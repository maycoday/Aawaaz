import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ReportForm from './components/ReportForm';
import TrackApplication from './components/TrackApplication';
import HowItWorks from './components/HowItWorks';
import PatternDetection from './components/PatternDetection';
import AuthorityPortal from './components/AuthorityPortal';
import Footer from './components/Footer';
import AuthorityLogin from './components/AuthorityLogin';
import ComplaintDashboard from './components/ComplaintDashboard';
import './App.css';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <div className="app">
          <Routes>
            {/* Public Routes - Main Website */}
            <Route path="/" element={
              <>
                <Navbar />
                <Hero />
                <main className="container">
                  <ReportForm />
                  <TrackApplication />
                  <HowItWorks />
                  <PatternDetection />
                  <AuthorityPortal />
                </main>
                <Footer />
              </>
            } />

            {/* Authority Portal Routes */}
            <Route path="/authority/login" element={<AuthorityLogin />} />
            
            <Route path="/authority/dashboard/*" element={
              <ProtectedRoute>
                <ComplaintDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
