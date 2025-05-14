import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../App.css';
import apiClient, { formatErrorMessage } from '../../utils/apiClient';

// Login component handles user authentication with username/password
function Login() {
    // State for form fields and error handling
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get the path user was trying to access before being redirected to login
    const from = location.state?.from || "/dashboard";

    // Handle form submission and authentication logic
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            // Use apiClient instead of direct axios
            const response = await apiClient.post('/auth/login', {
                username,
                password
            });

            // Store token and user info in localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('username', response.data.username);
            
            // Check if user is verified
            if (response.data.verified === false) {
                // Redirect to verification needed page
                navigate('/verify-email-needed');
                return;
            }

            // Trigger storage event for components listening to auth changes
            window.dispatchEvent(new Event('storage'));
            
            // Redirect user to dashboard or the page they were trying to access
            navigate(from);
        } catch (error) {
            console.error('Login error:', error);
            setError(formatErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    // Render login form with username/password fields
    return (
        <div className="page-container">
            <div className="form-container">
                <div className="page-header">
                    <h2 className="page-title">Login</h2>
                    <p className="page-subtitle">Sign in to your account</p>
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
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Links to registration and admin login */}
                <p className="text-center">
                    Don't have an account? <Link to="/register" className="text-primary">Register here</Link>
                </p>
                <p className="text-center admin-link">
                Are you an admin? <Link to="/admin-login" className="text-secondary">Click here</Link>
                </p>
                <p className="text-center">
                  Forgot your password? <Link to="/forgot-password" className="text-secondary">Click here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
