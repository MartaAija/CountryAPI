import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css';

// AdminLogin component - provides a specialized login interface for administrators
// Allows admins to access the admin dashboard with secure credentials
function AdminLogin() {
    // State variables for form fields and error handling
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Handle admin login form submission and authentication
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError("");
        
        // Check against environment variables
        if (username === process.env.REACT_APP_ADMIN_USERNAME && 
            password === process.env.REACT_APP_ADMIN_PASSWORD) {
            // Ensure clean authentication state by clearing existing tokens
            localStorage.clear();
            
            // Set authentication state for admin access
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('token', 'admin-token');
            
            // Trigger storage event to update the navbar without page refresh
            window.dispatchEvent(new Event('storage'));
            
            // Short delay before navigation to ensure auth state is properly set
            setTimeout(() => {
                navigate('/admin');
            }, 100);
        } else {
            // Show error message for invalid credentials
            setError("Invalid admin credentials");
        }
    };

    // Render admin login form with username and password fields
    return (
        <div className="page-container">
            <div className="form-container">
                {/* Page header with title and subtitle */}
                <div className="page-header">
                    <h2 className="page-title">Admin Login</h2>
                    <p className="page-subtitle">Access admin dashboard</p>
                </div>

                {/* Error message display area */}
                {error && <div className="message error-message">{error}</div>}

                {/* Admin login form */}
                <form onSubmit={handleAdminLogin} className="form-group">
                    <div className="form-group">
                        <input 
                            type="text" 
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)} 
                            placeholder="Admin username"
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <input 
                            type="password" 
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Admin password"
                            required 
                        />
                    </div>

                    {/* Login submission button */}
                    <button type="submit" className="btn btn-primary">
                        Login as Admin
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin; 