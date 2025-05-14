import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../utils/authService';
import '../../App.css';

// AdminLogin component - provides a specialized login interface for administrators
// Allows admins to access the admin dashboard with secure credentials
function AdminLogin() {
    // State variables for form fields and error handling
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Handle admin login form submission and authentication
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        
        try {
            // Use the adminLogin utility function
            await adminLogin(username, password);
            
            // Navigate to admin dashboard on success
            navigate('/admin');
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.error || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
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
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                    </div>

                    {/* Login submission button */}
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login as Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin; 