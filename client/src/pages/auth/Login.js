import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/authApi';
import '../../App.css';

// Login component handles user authentication with username/password
// Supports both regular user and admin authentication flows
function Login() {
    // State for form fields and error messages
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Handle form submission and authentication logic
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        
        try {
            // First clear any existing auth tokens
            localStorage.clear();
            
            // Special case: Admin authentication with hardcoded credentials
            // In production, this would typically use a secure authentication endpoint
            if (username === 'admin' && password === 'admin1234') {
                localStorage.setItem('isAdmin', 'true');
                localStorage.setItem('token', 'admin-token');
                
                // Trigger storage event to update the navbar immediately
                window.dispatchEvent(new Event('storage'));
                
                // Short delay before navigation to ensure auth state is properly set
                setTimeout(() => {
                    navigate('/admin');
                }, 100);
                return;
            }

            // Regular user authentication via API
            const response = await loginUser(username, password);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('isAdmin', 'false');
            
            // Trigger storage event for immediate navbar update
            window.dispatchEvent(new Event('storage'));
            
            // Navigate to dashboard after authentication
            setTimeout(() => {
                navigate('/dashboard');
            }, 100);
        } catch (error) {
            // Display error message from API or a fallback message
            setError(error.response?.data?.error || "Login failed");
        }
    };

    // Render login form with username/password fields
    return (
        <div className="page-container">
            <div className="form-container">
                <div className="page-header">
                    <h2 className="page-title">Welcome Back</h2>
                    <p className="page-subtitle">Log in to access your account</p>
                </div>

                {/* Display error message if authentication fails */}
                {error && <div className="message error-message">{error}</div>}

                {/* Login form */}
                <form onSubmit={handleLogin} className="form-group">
                    <div className="form-group">
                        <input 
                            type="text" 
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)} 
                            placeholder="Enter username"
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <input 
                            type="password" 
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Enter password"
                            required 
                        />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Log In
                    </button>
                </form>

                {/* Links to registration and admin login */}
                <p className="text-center">
                    Don't have an account? <Link to="/register" className="text-primary">Register here</Link>
                </p>
                <p className="text-center admin-link">
                    <Link to="/admin-login" className="text-secondary">Are you an admin?</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
