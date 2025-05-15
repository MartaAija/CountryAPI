import apiClient from './apiClient';

/**
 * Authentication Service
 * Provides a complete set of authentication-related functions
 * Uses apiClient for all HTTP requests to ensure consistent error handling and throttling
 */

// Create a custom event for notifying components about auth state changes
const AUTH_CHANGE_EVENT = 'auth-change';

/**
 * Dispatches a custom event to notify components about authentication state changes
 * This is used to synchronize UI updates across components when auth state changes
 */
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
 * 
 * Authenticates a user by sending credentials to the server and
 * storing the returned user information in localStorage for UI purposes.
 * The actual authentication token is stored in an HttpOnly cookie by the server.
 * 
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise} - Response with auth token and user data
 * @throws {Error} - If authentication fails
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
 * 
 * Authenticates an admin user using CSRF protection to prevent CSRF attacks.
 * Gets a CSRF token first, then sends it along with credentials.
 * Admin sessions use special flags both in cookies and localStorage.
 * 
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise} - Response from admin login endpoint
 * @throws {Error} - If admin authentication fails
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
    if (response.data.success) {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('userId', 'admin');
      localStorage.setItem('username', 'admin');
      notifyAuthChange();
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout user - clear localStorage and API cookie
 * 
 * Performs a complete logout by:
 * 1. Clearing all authentication data from localStorage
 * 2. Making an API request to clear HttpOnly cookies on the server
 * 3. Notifying all components about the authentication state change
 * 
 * @returns {Promise<void>}
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
 * 
 * Performs an optimized session check that:
 * 1. First checks localStorage for any auth data to avoid unnecessary API calls
 * 2. Makes an API call to verify the HttpOnly cookie is still valid
 * 
 * This dual-check approach provides both security (server validation)
 * and performance (avoid unnecessary API calls).
 * 
 * @returns {Promise<boolean>} - True if user has valid session
 */
export const checkSession = async () => {
  // First check if we have any auth-related items in localStorage 
  // to avoid unnecessary API calls when clearly not authenticated
  const hasLocalStorageAuth = !!(
    localStorage.getItem('userId') || 
    localStorage.getItem('username') || 
    localStorage.getItem('isAdmin')
  );
  
  // If we have no auth data in localStorage, return false immediately
  // without making an API call that would result in a 401
  if (!hasLocalStorageAuth) {
    return false;
  }
  
  try {
    const response = await apiClient.get('/auth/session');
    return response.data.authenticated || false;
  } catch (error) {
    // Silently handle 401 errors as expected for unauthenticated state
    if (error.response && error.response.status === 401) {
      return false;
    }
    // Log other unexpected errors
    console.error('Unexpected error in session check:', error);
    return false;
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const sessionValid = await checkSession();
    return sessionValid;
  } catch (error) {
    return false;
  }
};

/**
 * Check if user is admin
 * 
 * Determines admin status through multiple checks:
 * 1. First checks localStorage for admin flag to avoid unnecessary API calls
 * 2. Then verifies against the server using HttpOnly cookie authentication
 * 
 * This ensures both UI responsiveness and security by validating admin status
 * with the server before granting access to sensitive operations.
 * 
 * @returns {Promise<boolean>} - True if user is admin
 */
export const isAdmin = async () => {
  // First check if we have admin flag in localStorage
  // to avoid unnecessary API calls
  const hasAdminFlag = localStorage.getItem('isAdmin') === 'true';
  
  // Also check if we're authenticated at all to avoid unnecessary API calls
  const hasAuth = !!(
    localStorage.getItem('userId') ||
    localStorage.getItem('username')
  );
  
  // If there's no admin flag or no auth data, no need to make an API call
  if (!hasAdminFlag || !hasAuth) {
    return false;
  }
  
  // Check admin status via HttpOnly cookie
  try {
    const response = await apiClient.get('/auth/admin-check');
    return response.data.isAdmin || false;
  } catch (error) {
    // Silently handle 401 errors as expected for unauthenticated state
    if (error.response && error.response.status === 401) {
      return false;
    }
    // Log other unexpected errors
    console.error('Unexpected admin check error:', error);
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