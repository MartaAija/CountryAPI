import apiClient from './apiClient';
import config from '../config';

/**
 * Authentication Service
 * Provides a complete set of authentication-related functions
 * Uses apiClient for all HTTP requests to ensure consistent error handling and throttling
 */

// Create a custom event for notifying components about auth state changes
const AUTH_CHANGE_EVENT = 'auth-change';

// Function to dispatch auth change event
function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

/**
 * Register a new user with the API
 * @param {Object} userData - Contains username, password, email, first_name, last_name
 * @returns {Promise} Response with user data and token
 */
export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  
  // Store user info (but not tokens) in localStorage for UI purposes only
  if (response.data.userId) {
    localStorage.setItem('userId', response.data.userId);
    localStorage.setItem('username', response.data.username);
    notifyAuthChange();
  }
  
  return response.data;
};

/**
 * Login user with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise} - Response with auth token and user data
 */
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    
    // Store user info (but not tokens) in localStorage for UI purposes only
    if (response.data.userId) {
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      notifyAuthChange();
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Login as admin
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise} - Response from admin login endpoint
 */
export const adminLogin = async (username, password) => {
  try {
    // Get CSRF token first
    await apiClient.get('/auth/csrf-token');
    
    // Get token from cookie
    const csrfToken = getCookie('XSRF-TOKEN');
    
    // Login with CSRF protection
    const response = await apiClient.post(
      '/auth/admin/login', 
      { username, password, _csrf: csrfToken },
      { headers: { 'X-CSRF-Token': csrfToken } }
    );
    
    // Store admin flag in localStorage for UI purposes only
    if (response.data.userId) {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      notifyAuthChange();
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout user - clear localStorage and API cookie
 */
export const logout = async () => {
  try {
    // Clear localStorage user data
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    
    // Clear HttpOnly cookie by making a logout request
    await apiClient.post('/auth/logout');
    
    // Notify components about auth change
    notifyAuthChange();
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * Get the user's profile information
 * @returns {Promise} - User profile data
 */
export const getProfile = async () => {
  const response = await apiClient.get('/auth/profile');
  return response.data;
};

/**
 * Check if user has an active session
 * @returns {Promise<boolean>} - True if user has valid session
 */
export const checkSession = async () => {
  try {
    const response = await apiClient.get('/auth/session');
    return response.data.authenticated || false;
  } catch (error) {
    return false;
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if user is authenticated
 */
export const isAuthenticated = async () => {
  // Check session via HttpOnly cookie
  try {
    const sessionValid = await checkSession();
    return sessionValid;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};

/**
 * Check if user is admin
 * @returns {Promise<boolean>} - True if user is admin
 */
export const isAdmin = async () => {
  // Check admin status via HttpOnly cookie
  try {
    const response = await apiClient.get('/auth/admin-check');
    return response.data.isAdmin || false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};

/**
 * Helper function to get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}; 