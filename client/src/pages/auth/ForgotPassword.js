import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient, { formatErrorMessage } from "../../utils/apiClient";
import '../../App.css';

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsLoading(true);
        
        if (!email) {
            setError("Email is required");
            setIsLoading(false);
            return;
        }
        
        try {
            // Use apiClient for automatic throttling and error handling
            const response = await apiClient.post(
                '/auth/forgot-password', 
                { email }
            );
            setMessage(response.data.message);
            setSuccess(true);
            // Clear the form
            setEmail("");
        } catch (error) {
            console.error("Password reset request error:", error);
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
                    <h2 className="page-title">Forgot Password</h2>
                    {!success && (
                        <p className="page-subtitle">Enter your email to receive password reset instructions</p>
                    )}
                </div>

                {error && <div className="message error-message">{error}</div>}
                {message && <div className="message success-message">{message}</div>}

                {!success ? (
                    <>
                        <form onSubmit={handleSubmit} className="form-group">
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                disabled={isLoading}
                            />
                            
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Send Reset Instructions'}
                            </button>
                        </form>
                        <p className="text-center">
                            <Link to="/login" className="text-primary">Back to Login</Link>
                        </p>
                    </>
                ) : (
                    <div className="success-actions" style={{ textAlign: 'center' }}>
                        <p>Check your email for password reset instructions.</p>
                        <button 
                            onClick={handleLogin} 
                            className="btn-primary"
                            style={{ margin: '20px auto', display: 'block' }}
                        >
                            BACK TO LOGIN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ForgotPassword;
