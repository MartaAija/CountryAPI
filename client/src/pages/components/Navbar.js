import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../App.css'; 

// Main navigation component that dynamically updates based on user authentication status
function Navbar() {
    // Get current location to highlight active navigation link
    const location = useLocation();
    // Track if user is logged in
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Track if user has admin privileges
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Function to check auth status from localStorage
        const checkAuthStatus = () => {
            const token = localStorage.getItem('token');
            const adminStatus = localStorage.getItem('isAdmin') === 'true';
            setIsAuthenticated(!!token);
            setIsAdmin(adminStatus);
        };

        // Check initial status when component mounts
        checkAuthStatus();

        // Listen for auth changes through localStorage events
        const handleStorageChange = () => {
            checkAuthStatus();
        };

        // Add event listeners for both standard storage events and custom authChange events
        window.addEventListener('storage', handleStorageChange);
        // Custom event listener for direct auth status updates from Login/Logout components
        window.addEventListener('authChange', handleStorageChange);

        // Clean up event listeners on component unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('authChange', handleStorageChange);
        };
    }, []);

    // Helper function to determine if a nav link should be highlighted as active
    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="nav-container">
            <div className="nav-content">
                {/* Site logo/name with home link */}
                <Link to="/" className="nav-brand">
                    Country API
                </Link>
                <div className="nav-links">
                    {!isAuthenticated ? (
                        // Links shown to visitors who aren't logged in
                        <>
                            <Link to="/home" className={`nav-link ${isActive('/home')}`}>
                                Home
                            </Link>
                            <Link to="/login" className={`nav-link ${isActive('/login')}`}>
                                Login
                            </Link>
                            <Link to="/register" className={`nav-link ${isActive('/register')}`}>
                                Register
                            </Link>
                        </>
                    ) : isAdmin ? (
                        // Links shown to administrators
                        <>
                            <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                                Dashboard
                            </Link>
                            <Link to="/logout" className={`nav-link ${isActive('/logout')}`}>
                                Logout
                            </Link>
                        </>
                    ) : (
                        // Links shown to regular authenticated users
                        <>
                            <Link to="/home" className={`nav-link ${isActive('/home')}`}>
                                Home
                            </Link>
                            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                                Search
                            </Link>
                            <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
                                Settings
                            </Link>
                            <Link to="/logout" className={`nav-link ${isActive('/logout')}`}>
                                Logout
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
