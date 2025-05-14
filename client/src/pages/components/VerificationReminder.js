import React, { useState, useEffect } from 'react';
import apiClient, { formatErrorMessage } from '../../utils/apiClient';
import { isAuthenticated } from '../../utils/authService';

/**
 * Email Verification Reminder Component
 * Shows a banner reminding users to verify their email and provides a resend option
 */
function VerificationReminder() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isVerified, setIsVerified] = useState(true); // Default to true to hide banner
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  
  // Check user's verification status when component mounts
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // First check if user is authenticated
        const authenticated = await isAuthenticated();
        setIsUserLoggedIn(authenticated);
        
        if (authenticated) {
          // Get user profile to check verification status
          const profileResponse = await apiClient.get('/auth/profile');
          setIsVerified(profileResponse.data.verified === true);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        // Fall back to localStorage for backward compatibility
        setIsVerified(localStorage.getItem('verified') === 'true');
      }
    };
    
    checkVerificationStatus();
  }, []);
  
  // If the user is verified, don't show the reminder
  if (isVerified || !isUserLoggedIn) {
    return null;
  }
  
  // Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setResending(true);
      setMessage('');
      
      // Send request to resend verification email using apiClient
      const response = await apiClient.post('/auth/resend-verification');
      
      setMessageType('success');
      setMessage(response.data.message || 'Verification email sent successfully. Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification email:', error);
      setMessageType('error');
      setMessage(formatErrorMessage(error));
    } finally {
      setResending(false);
    }
  };
  
  return (
    <div className="verification-reminder">
      <div className="reminder-content">
        <span className="reminder-icon">⚠️</span>
        <p>
          Your email address has not been verified. Please check your inbox for the verification email.
        </p>
        <button 
          className="resend-btn"
          onClick={handleResendVerification}
          disabled={resending}
        >
          {resending ? 'Sending...' : 'Resend Email'}
        </button>
      </div>
      
      {message && (
        <div className={`reminder-message ${messageType === 'success' ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default VerificationReminder; 