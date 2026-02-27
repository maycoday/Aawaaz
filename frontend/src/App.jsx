import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ReportForm from './components/ReportForm';
import HowItWorks from './components/HowItWorks';
import PatternDetection from './components/PatternDetection';
import AuthorityPortal from './components/AuthorityPortal';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <main className="container">
                <ReportForm />
                <HowItWorks />
                <PatternDetection />
                <AuthorityPortal />
              </main>
            </>
          } />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
