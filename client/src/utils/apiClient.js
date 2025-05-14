/**
 * API Client
 * Centralized axios instance with throttling and retry logic
 */
import axios from 'axios';
import config from '../config';

// Simple rate limiting mechanism
let requestTimestamps = [];
const MAX_REQUESTS_PER_WINDOW = 50; // Maximum requests allowed in the time window
const TIME_WINDOW_MS = 10000; // Time window in milliseconds (10 seconds)
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Check if we should throttle requests to avoid 429 errors
 * @returns {boolean} - True if request should be throttled
 */
const shouldThrottleRequest = () => {
  const now = Date.now();
  // Remove timestamps older than the time window
  requestTimestamps = requestTimestamps.filter(timestamp => now - timestamp < TIME_WINDOW_MS);
  
  // Check if we've exceeded the rate limit
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn('Rate limit reached, throttling requests');
    return true;
  }
  
  // Add current timestamp to the list
  requestTimestamps.push(now);
  return false;
};

// Create axios instance with the base URL
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true // Enable cookies for authentication
});

// Request interceptor - apply rate limiting
apiClient.interceptors.request.use(async config => {
  if (shouldThrottleRequest()) {
    // If we're at the rate limit, delay the request
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Include API key if available for backward compatibility with API key features
  const apiKey = localStorage.getItem('activeApiKey');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  
  return config;
});

// Response interceptor - handle 429 errors with retry logic
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If we got a 429 response and haven't retried too many times
    if (
      error.response &&
      error.response.status === 429 &&
      (!originalRequest._retryCount || originalRequest._retryCount < MAX_RETRIES)
    ) {
      // Increment the retry count
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      console.warn(`Rate limited (429). Retrying in ${RETRY_DELAY}ms... (${originalRequest._retryCount}/${MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry the request
      return apiClient(originalRequest);
    }
    
    // If it's not a 429 error or we've retried too many times, reject with the error
    return Promise.reject(error);
  }
);

/**
 * Format error messages for display
 * @param {Error} error - The error object
 * @returns {string} - Formatted error message
 */
export const formatErrorMessage = (error) => {
  if (error.response) {
    // Server responded with an error status code
    if (error.response.data && error.response.data.error) {
      return error.response.data.error;
    }
    if (error.response.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    if (error.response.status === 401) {
      return 'Authentication required. Please log in again.';
    }
    if (error.response.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response.status === 404) {
      return 'The requested resource was not found.';
    }
    return `Server error (${error.response.status}). Please try again later.`;
  } else if (error.request) {
    // Request was made but no response received
    return 'No response from server. Please check your internet connection.';
  } else {
    // Something happened in setting up the request
    return error.message || 'An unknown error occurred.';
  }
};

export default apiClient; 