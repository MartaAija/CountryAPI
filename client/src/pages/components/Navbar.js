import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, isAdmin, logout } from '../../utils/authService';
import '../../App.css'; 

/**
 * Navbar Component
 * 
 * A responsive navigation bar that dynamically updates based on user authentication status.
 * Shows different navigation options for:
 * - Unauthenticated users (visitors)
 * - Regular authenticated users
 * - Admin users
 * 
 * Handles auth state synchronization between localStorage and HttpOnly cookies
 * to maintain security best practices while providing a good UX.
 */
function Navbar() {
    // Get current location to highlight active navigation link
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = localStorage.getItem('userId');
    
    // Use state to track authentication status
    const [userAuthenticated, setUserAuthenticated] = useState(false);
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    /**
     * Effect hook to check authentication on mount and when auth changes
     * Ensures auth state consistency between cookies and localStorage
     */
    useEffect(() => {
        /**
         * Updates authentication state by checking both cookie auth (via API) and localStorage
         * Resolves any inconsistencies between them to ensure proper state
         */
        const updateAuthState = async () => {
            setLoading(true);
            try {
                // Check authentication status from cookies via API
                const authStatus = await isAuthenticated();
                
                // Get the localStorage admin status
                const localStorageAdmin = localStorage.getItem('isAdmin') === 'true';
                const localStorageUserId = localStorage.getItem('userId');
                
                // Detect and resolve inconsistency between cookie auth and localStorage
                // This happens if user's session expired but localStorage values remain
                if (!authStatus && (localStorageUserId || localStorageAdmin)) {
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
                    
                    // Resolve admin status inconsistency if it exists
                    if (!adminStatus && localStorageAdmin) {
                        localStorage.removeItem('isAdmin');
                    }
                    
                    setUserIsAdmin(adminStatus);
                } else {
                    setUserIsAdmin(false);
                    
                    // Clean up localStorage if not authenticated
                    localStorage.removeItem('userId');
                    localStorage.removeItem('username');
                    localStorage.removeItem('isAdmin');
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
                setUserAuthenticated(false);
                setUserIsAdmin(false);
                
                // Clean up localStorage on error as a precaution
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                localStorage.removeItem('isAdmin');
            } finally {
                setLoading(false);
            }
        };

        // Initial check
        updateAuthState();
        
        /**
         * Event listener for auth change events from other components
         * Triggered when login/logout happens elsewhere in the app
         */
        const handleAuthChange = () => {
            updateAuthState();
        };
        
        window.addEventListener('auth-change', handleAuthChange);
        
        /**
         * Special case check for logout route to ensure navigation state updates
         * Handles edge case where user directly navigates to /logout
         */
        const checkAuthOnRouteChange = () => {
            if (location.pathname === '/logout') {
                setTimeout(updateAuthState, 500); // Small delay to ensure logout completes
            }
        };
        checkAuthOnRouteChange();
        
        // Cleanup event listener on component unmount
        return () => {
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, [location.pathname]);

    /**
     * Determines if a nav link should be highlighted as active
     * @param {string} path - The path to check against current location
     * @param {string} param - Optional parameter for paths with URL params
     * @returns {string} - 'active' class name if active, empty string otherwise
     */
    const isActiveLink = (path, param = null) => {
        if (param) {
            // For paths with parameters like /blog/user/:userId
            return location.pathname.includes(path) && location.pathname.includes(param) ? 'active' : '';
        }
        return location.pathname === path ? 'active' : '';
    };

    // Display a minimal navbar during authentication check
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
