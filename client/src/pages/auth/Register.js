import { useState } from "react";
import { registerUser } from "../services/authApi"; // Import the API function
import { useNavigate } from "react-router-dom";
import '../../App.css';
import { Link } from "react-router-dom";

// Component for user registration with form validation and modal feedback
function Register() {
    // State for form input fields
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // State for UI control and feedback
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [passwordErrors, setPasswordErrors] = useState([]);
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
        
        // Password validation
        const errors = validatePassword(password);
        if (errors.length > 0) {
            setPasswordErrors(errors);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        const registrationData = {
            username,
            password,
            first_name: firstName,
            last_name: lastName
        };

        try {
            await registerUser(registrationData);
            setMessage("Registration successful!");
            setShowModal(true);
        } catch (error) {
            setError(error.response?.data?.error || "Registration failed");
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
                    />
                    <input 
                        type="text" 
                        placeholder="First Name" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="Last Name" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)} 
                        required 
                    />
                    <div className="password-input-container">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={handlePasswordChange} 
                            required 
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
                    />
                    <button type="submit">Register</button>
                </form>

                {/* Login link for existing users */}
                <p className="text-center">
                    Already have an account? <Link to="/login" className="text-primary">Login here</Link>
                </p>
            </div>

            {/* Success modal that appears after successful registration */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal text-center">
                        <h3 className="modal-title">Registration Successful</h3>
                        <p className="success-text">
                            Your account has been created successfully! Your primary API key has been automatically generated.
                        </p>
                        <p className="text-secondary">
                            Please log in to access your dashboard and view your API key in the Settings page.
                        </p>
                        <div className="controls">
                            <button 
                                onClick={handleLoginRedirect}
                                className="btn-primary"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Register;
