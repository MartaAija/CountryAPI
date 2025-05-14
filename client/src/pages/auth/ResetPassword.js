import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import apiClient, { formatErrorMessage } from "../../utils/apiClient";
import '../../App.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordErrors, setPasswordErrors] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);
    
    const navigate = useNavigate();
    
    // Extract token and userId from URL params
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    
    useEffect(() => {
        // Check if token and userId are present
        if (!token || !userId) {
            setTokenValid(false);
            setError("Invalid password reset link. Missing token or user ID.");
        }
    }, [token, userId]);

    // Password validation function that checks for minimum requirements
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (!/\d/.test(password)) {
            errors.push("Password must contain at least one number");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push("Password must contain at least one symbol");
        }
        return errors;
    };

    // Handler for password field with real-time validation
    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        setPasswordErrors(validatePassword(newPassword));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsLoading(true);
        
        // Password validation
        const errors = validatePassword(password);
        if (errors.length > 0) {
            setPasswordErrors(errors);
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            setIsLoading(false);
            return;
        }
        
        try {
            // Use apiClient with built-in throttling protection
            const response = await apiClient.post(
                '/auth/reset-password', 
                { token, userId, password }
            );
            setMessage(response.data.message);
            setSuccess(true);
            // Clear the form
            setPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Password reset error:", error);
            setError(formatErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLogin = () => {
        navigate('/login');
    };

    return (
        <div className="page-container">
            <div className="form-container">
                <div className="page-header">
                    <h2 className="page-title">Reset Password</h2>
                    {!success && tokenValid && (
                        <p className="page-subtitle">Enter your new password</p>
                    )}
                </div>

                {error && <div className="message error-message">{error}</div>}
                {message && <div className="message success-message">{message}</div>}

                {!success && tokenValid ? (
                    <>
                        <form onSubmit={handleSubmit} className="form-group">
                            <div className="password-input-container">
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={password}
                                    onChange={handlePasswordChange} 
                                    required 
                                    disabled={isLoading}
                                />
                                {passwordErrors.length > 0 && (
                                    <div className="password-requirements">
                                        {passwordErrors.map((error, index) => (
                                            <p key={index} className="requirement-item" style={{ color: 'var(--warning-color)', fontSize: '0.9rem', margin: '0.2rem 0' }}>
                                                ⚠️ {error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <input 
                                type="password" 
                                placeholder="Confirm Password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                                disabled={isLoading}
                            />
                            
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="success-actions" style={{ textAlign: 'center' }}>
                        {success && <p>Your password has been reset successfully.</p>}
                        <button 
                            onClick={handleLogin} 
                            className="btn-primary"
                            style={{ margin: '20px auto', display: 'block' }}
                        >
                            GO TO LOGIN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResetPassword; 