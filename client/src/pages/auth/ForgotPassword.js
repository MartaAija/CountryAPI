import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import '../../App.css';
import config from '../../config';

function ForgotPassword() {
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordErrors, setPasswordErrors] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

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
        const password = e.target.value;
        setNewPassword(password);
        setPasswordErrors(validatePassword(password));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        
        // Password validation
        const errors = validatePassword(newPassword);
        if (errors.length > 0) {
            setPasswordErrors(errors);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }
        
        try {
            const response = await axios.post(
                `${config.apiBaseUrl}/auth/forgot-password`, 
                { username, newPassword }
            );
            setMessage(response.data.message);
            setSuccess(true);
            // Clear the form
            setUsername("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setError(error.response?.data?.error || "Failed to reset password");
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
                    {!success && (
                        <p className="page-subtitle">Enter your username and new password</p>
                    )}
                </div>

                {error && <div className="message error-message">{error}</div>}
                {message && <div className="message success-message">{message}</div>}

                {!success ? (
                    <>
                        <form onSubmit={handleSubmit} className="form-group">
                            <input 
                                type="text" 
                                placeholder="Username" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)} 
                                required 
                            />
                            
                            <div className="password-input-container">
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={newPassword}
                                    onChange={handlePasswordChange} 
                                    required 
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
                            />
                            
                            <button type="submit">Reset Password</button>
                        </form>
                        <p className="text-center">
                            <Link to="/login" className="text-primary">Back to Login</Link>
                        </p>
                    </>
                ) : (
                    <div className="success-actions" style={{ textAlign: 'center' }}>
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

export default ForgotPassword;
