import { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../../App.css';
import { Link } from "react-router-dom";
import apiClient, { formatErrorMessage } from '../../utils/apiClient';

// Component for user registration with form validation and modal feedback
function Register() {
    // State for form input fields
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // State for UI control and feedback
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [passwordErrors, setPasswordErrors] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
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
        const newPassword = e.target.value;
        setPassword(newPassword);
        setPasswordErrors(validatePassword(newPassword));
    };

    // Form submission handler with validation and API call
    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
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

        const registrationData = {
            username,
            password,
            email,
            first_name: firstName,
            last_name: lastName
        };

        try {
            // Use apiClient instead of axios directly
            const response = await apiClient.post('/auth/register', registrationData);
            
            // Don't store token in localStorage since we want user to verify email first
            // Just set the message and show modal
            
            setMessage(response.data.message || "Registration successful! Please check your email to verify your account.");
            setShowModal(true);
        } catch (error) {
            // Log the full error for debugging
            console.error('Registration error:', error);
            
            // Use formatErrorMessage for consistent error display
            setError(formatErrorMessage(error));
        } finally {
            setIsLoading(false);
        }        
    };

    // Navigation handler for redirecting to login after successful registration
    const handleLoginRedirect = () => {
        navigate('/login');
    };

    return (
        <div className="page-container">
            <div className="form-container">
                <div className="page-header">
                    <h2 className="page-title">Register</h2>
                    <p className="page-subtitle">Create your account to get started</p>
                </div>

                {/* Error message display */}
                {error && <div className="message error-message">{error}</div>}

                {/* Registration form with input fields */}
                <form onSubmit={handleRegister} className="form-group">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                        disabled={isLoading}
                    />
                    <input 
                        type="text" 
                        placeholder="First Name" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)} 
                        required 
                        disabled={isLoading}
                    />
                    <input 
                        type="text" 
                        placeholder="Last Name" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)} 
                        required 
                        disabled={isLoading}
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                        disabled={isLoading}
                    />
                    <div className="password-input-container">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={handlePasswordChange} 
                            required 
                            disabled={isLoading}
                        />
                        {/* Password requirement warnings */}
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
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                {/* Login link for existing users */}
                <p className="text-center">
                    Already have an account? <Link to="/login" className="text-primary">Login here</Link>
                </p>
            </div>

            {/* Success modal that appears after successful registration */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">Registration Successful!</h3>
                        <div className="success-text">
                            {message}
                        </div>
                        <p className="text-secondary">
                            We've sent a verification email to <strong>{email}</strong>. 
                            Please check your inbox (and spam folder) to verify your account.
                        </p>
                        <div className="controls">
                            <button 
                                onClick={handleLoginRedirect}
                                className="btn-primary"
                            >
                                Continue to Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Register;
