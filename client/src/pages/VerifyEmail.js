import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient, { formatErrorMessage } from '../utils/apiClient';
import '../App.css';
import config from '../config';

/**
 * Email Verification Component
 * Handles the verification of user email address, password change, or email change
 * from the link sent to their email
 */
function VerifyEmail({ type = 'verification' }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Processing your verification...');
  
  // Extract token and userId from URL params
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');
  
  useEffect(() => {
    const verify = async () => {
      // Check if token and userId are present
      if (!token || !userId) {
        setStatus('error');
        setMessage('Invalid verification link. Token or user ID is missing.');
        return;
      }
      
      try {
        let endpoint;
        let processingMessage;
        
        // Determine the endpoint and message based on verification type
        switch (type) {
          case 'password':
            endpoint = '/auth/verify-password-change';
            processingMessage = 'Verifying your password change...';
            break;
          case 'email':
            endpoint = '/auth/verify-email-change';
            processingMessage = 'Verifying your email change...';
            break;
          default:
            endpoint = '/auth/verify-email';
            processingMessage = 'Verifying your email address...';
        }
        
        setMessage(processingMessage);
        
        // Call the API to verify using apiClient
        const response = await apiClient.get(`${endpoint}?token=${token}&userId=${userId}`);
        
        // Set success status and message
        setStatus('success');
        
        // Customize message based on verification type
        if (type === 'password') {
          setMessage('Your password has been successfully changed! Please log out and log in again to use your new password.');
        } else if (type === 'email') {
          setMessage('Your email address has been successfully updated!');
        } else {
          setMessage(response.data.message);
        }
        
        // For backward compatibility, will be handled properly by HttpOnly cookies
        if (response.data.logout) {
          // The backend should handle clearing cookies
          // Clear localStorage for backward compatibility
          localStorage.removeItem('token');
          localStorage.removeItem('verified');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('isAdmin');
        } else if (response.data.token) {
          // For backward compatibility
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('verified', 'true');
        }
        
        // Redirect based on verification type
        const redirectTimeout = setTimeout(() => {
          if (type === 'password' || type === 'email') {
            navigate('/settings');
          } else {
            navigate('/login');
          }
        }, 3000);
        
        return () => clearTimeout(redirectTimeout);
      } catch (error) {
        console.error('Verification error:', error);
        // Set error status and message
        setStatus('error');
        setMessage(formatErrorMessage(error));
      }
    };
    
    // Start the verification process
    verify();
  }, [token, userId, navigate, type]);
  
  // Get title based on verification type
  const getTitle = () => {
    switch (type) {
      case 'password':
        return 'Password Change Verification';
      case 'email':
        return 'Email Change Verification';
      default:
        return 'Email Verification';
    }
  };
  
  // Get appropriate redirect button based on verification type
  const getRedirectButton = () => {
    if (type === 'password' || type === 'email') {
      return (
        <Link to="/settings" className="btn btn-primary">
          Back to Settings
        </Link>
      );
    } else {
      return (
        <Link to="/login" className="btn btn-primary">
          Continue to Login
        </Link>
      );
    }
  };
  
  // Get redirect message based on verification type
  const getRedirectMessage = () => {
    if (type === 'password' || type === 'email') {
      return "You will be redirected to the settings page shortly.";
    } else {
      return "You will be redirected to the login page shortly.";
    }
  };
  
  return (
    <div className="page-container">
      <div className="form-container">
        <div className="page-header">
          <h1 className="page-title">{getTitle()}</h1>
        </div>
        
        {/* Show appropriate message based on status */}
        {status === 'verifying' && (
          <div className="message">
            <p>{message}</p>
            <div className="loading-spinner">Processing...</div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="success-message message">
            <p>{message}</p>
            <p>{getRedirectMessage()}</p>
            {getRedirectButton()}
          </div>
        )}
        
        {status === 'error' && (
          <div className="error-message message">
            <p>{message}</p>
            <div className="controls">
              {type === 'password' || type === 'email' ? (
                <Link to="/settings" className="btn btn-primary">Back to Settings</Link>
              ) : (
                <Link to="/login" className="btn btn-primary">Back to Login</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail; 