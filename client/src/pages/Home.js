import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

/**
 * Home page component
 * Landing page with information about the API service
 */
function Home() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("token") !== null;

    return (
        <div className="home-container">
            {/* Hero section with main headline */}
            <section className="hero-section">
                <h1 className="hero-title">Secure Country Data API</h1>
                <p className="hero-subtitle">
                    Your trusted gateway to worldwide country information with enterprise-grade security
                </p>
            </section>

            {/* Feature highlights section */}
            <section className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <h3 className="feature-title">Secure Access</h3>
                    <p className="feature-description">
                        Ensured security with API key authentication and robust user management
                    </p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">🌍</div>
                    <h3 className="feature-title">Global Data</h3>
                    <p className="feature-description">
                        Comprehensive country information including currencies, capitals, flagsand languages
                    </p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">⚡</div>
                    <h3 className="feature-title">Streamlined Response</h3>
                    <p className="feature-description">
                        Optimized data delivery with essential information in a clean, efficient format
                    </p>
                </div>
            </section>

            {/* Detailed service description */}
            <section className="about-section">
                <h2 className="section-title">About Our Service</h2>
                <div className="about-content">
                    {/* Service introduction */}
                    <p>
                        Welcome to our secure API middleware service, your gateway to accessing comprehensive 
                        country information from RestCountries.com. We provide a streamlined interface that 
                        delivers essential country data while maintaining robust security measures.
                    </p>
                    <br />
                    <p>
                        Our service offers detailed information about countries worldwide, including:
                    </p>
                    {/* Data feature list */}
                    <div className="feature-list">
                        <div className="feature-item">🏳️ Official country names and flags</div>
                        <div className="feature-item">💰 Currency details and information</div>
                        <div className="feature-item">🏛️ Capital city data</div>
                        <div className="feature-item">🗣️ Official languages</div>
                    </div>
                    <br />
                    <p>
                        With our <span className="highlight-text">secure authentication system</span>, users can:
                    </p>
                    {/* Security feature list */}
                    <div className="feature-list">
                        <div className="feature-item">Create and manage their accounts</div>
                        <div className="feature-item">Generate and control API keys</div>
                        <div className="feature-item">Access our comprehensive API documentation</div>
                        <div className="feature-item">Enjoy secure, encrypted data transmission</div>
                    </div>
                </div>
            </section>

            {/* Call to action - only shown to non-logged in users */}
            {!isLoggedIn && (
                <section className="cta-section">
                    <h2 className="section-title">Get Started Today</h2>
                    <div className="feature-card">
                        <p className="feature-description">
                            Ready to access global country data securely? Create an account and get your API key in minutes.
                        </p>
                        <Link to="/register" className="btn btn-primary">
                            Register Now
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}

export default Home;
