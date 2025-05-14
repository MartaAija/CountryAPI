import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, isAdmin, logout } from '../../utils/authService';
import '../../App.css'; 

// Main navigation component that dynamically updates based on user authentication status
function Navbar() {
    // Get current location to highlight active navigation link
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('userId');
    
    // Use state to track authentication status
    const [userAuthenticated, setUserAuthenticated] = useState(false);
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Effect to check authentication on mount and when auth changes
    useEffect(() => {
        // Function to update auth state from cookie-based authentication
        const updateAuthState = async () => {
            setLoading(true);
            try {
                // Check authentication status from cookies via API
                const authStatus = await isAuthenticated();
                console.log('Authentication status:', authStatus);
                
                // Get the localStorage admin status
                const localStorageAdmin = localStorage.getItem('isAdmin') === 'true';
                const localStorageUserId = localStorage.getItem('userId');
                
                // If localStorage says user is authenticated but cookies say they aren't,
                // we need to perform a full logout to sync the state
                if (!authStatus && (localStorageUserId || localStorageAdmin)) {
                    console.log('Cookie auth and localStorage out of sync, performing cleanup');
                    await logout();
                    setUserAuthenticated(false);
                    setUserIsAdmin(false);
                    setLoading(false);
                    return;
                }
                
                setUserAuthenticated(authStatus);
                
                // Only check admin status if user is authenticated
                if (authStatus) {
                    const adminStatus = await isAdmin();
                    console.log('Admin status:', adminStatus);
                    
                    // If API says not admin but localStorage says admin, fix the mismatch
                    if (!adminStatus && localStorageAdmin) {
                        console.log('Admin status mismatch, fixing...');
                        localStorage.removeItem('isAdmin');
                    }
                    
                    setUserIsAdmin(adminStatus);
                } else {
                    setUserIsAdmin(false);
                    
                    // If not authenticated, clear localStorage items
                    localStorage.removeItem('userId');
                    localStorage.removeItem('username');
                    localStorage.removeItem('isAdmin');
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
                setUserAuthenticated(false);
                setUserIsAdmin(false);
                
                // Clear localStorage on error
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                localStorage.removeItem('isAdmin');
            } finally {
                setLoading(false);
            }
        };

        // Initial check
        updateAuthState();
        
        // Listen for custom auth change events
        const handleAuthChange = () => {
            console.log('Auth change event detected');
            updateAuthState();
        };
        
        window.addEventListener('auth-change', handleAuthChange);
        
        // Also recheck auth state on route changes to keep nav updated
        const checkAuthOnRouteChange = () => {
            if (location.pathname === '/logout') {
                console.log('Logout route detected, will update auth state');
                setTimeout(updateAuthState, 500); // Small delay to ensure logout completes
            }
        };
        checkAuthOnRouteChange();
        
        return () => {
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, [location.pathname]);

    // Helper function to determine if a nav link should be highlighted as active
    const isActiveLink = (path, param = null) => {
        if (param) {
            // For paths with parameters like /blog/user/:userId
            return location.pathname.includes(path) && location.pathname.includes(param) ? 'active' : '';
        }
        return location.pathname === path ? 'active' : '';
    };

    // If still loading auth status, show minimal navbar
    if (loading) {
        return (
            <nav className="nav-container">
                <div className="nav-content">
                    <Link to="/" className="nav-brand">
                        TravelTales
                    </Link>
                </div>
            </nav>
        );
    }

    return (
        <nav className="nav-container">
            <div className="nav-content">
                {/* Site logo/name with home link */}
                <Link to="/" className="nav-brand">
                    TravelTales
                </Link>
                <div className="nav-links">
                    {!userAuthenticated ? (
                        // Links shown to visitors who aren't logged in
                        <>
                            <Link to="/home" className={`nav-link ${isActiveLink('/home')}`}>
                                Home
                            </Link>
                            <Link to="/blog" className={`nav-link ${isActiveLink('/blog')}`}>
                                Travel Blog
                            </Link>
                            <Link to="/login" className={`nav-link ${isActiveLink('/login')}`}>
                                Login
                            </Link>
                            <Link to="/register" className={`nav-link ${isActiveLink('/register')}`}>
                                Register
                            </Link>
                        </>
                    ) : userIsAdmin ? (
                        // Links shown to administrators
                        <>
                            <Link to="/admin" className={`nav-link ${isActiveLink('/admin')}`}>
                                Dashboard
                            </Link>
                            <Link to="/logout" className={`nav-link ${isActiveLink('/logout')}`}>
                                Logout
                            </Link>
                        </>
                    ) : (
                        // Links shown to regular authenticated users
                        <>
                            <Link to="/home" className={`nav-link ${isActiveLink('/home')}`}>
                                Home
                            </Link>
                            <Link to="/dashboard" className={`nav-link ${isActiveLink('/dashboard')}`}>
                                Search
                            </Link>
                            <Link to="/blog" className={`nav-link ${isActiveLink('/blog')}`}>
                                Travel Blogs
                            </Link>
                            <Link to="/blog/feed" className={`nav-link ${isActiveLink('/blog/feed')}`}>
                                My Feed
                            </Link>
                            {currentUserId && (
                                <Link 
                                    to={`/blog/user/${currentUserId}`} 
                                    className={`nav-link ${location.pathname === `/blog/user/${currentUserId}` ? 'active' : ''}`}
                                >
                                    Profile
                                </Link>
                            )}
                            <Link to="/settings" className={`nav-link ${isActiveLink('/settings')}`}>
                                Settings
                            </Link>
                            <Link to="/logout" className={`nav-link ${isActiveLink('/logout')}`}>
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
