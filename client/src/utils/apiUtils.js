import config from '../config';
import apiClient from './apiClient';

/**
 * API Utility Functions
 * Handles constructing correct endpoint URLs and specialized API requests
 */

/**
 * Get the API URL for blog endpoints
 * @param {string} path - The API path
 * @returns {Object} - Object with url
 */
export const getBlogApiUrl = (path) => {
  // Ensure path is a string
  const pathStr = String(path || '');
  let url;
  
  // If path is empty or undefined, default to /blog
  if (!pathStr) {
    return { url: `${config.apiBaseUrl}/blog` };
  }
  
  // Ensure the path starts with /blog in all cases
  if (pathStr.startsWith('/posts') || 
      pathStr.startsWith('/users') || 
      pathStr.startsWith('/comments') ||
      !pathStr.startsWith('/blog')) {
    // Standard blog API endpoints
    url = `${config.apiBaseUrl}/blog${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
  } else {
    // If it's already in the blog/ format
    url = `${config.apiBaseUrl}${pathStr}`;
  }
  
  console.log(`Blog API URL: ${url}`); // Debugging log
  return { url };
};

/**
 * Get auth API endpoint URL
 * @param {string} path - The API path
 * @returns {string} - Full URL for auth endpoint
 */
export const getAuthApiUrl = (path) => {
  // Ensure path is a string
  const pathStr = String(path || '');
  return `${config.apiBaseUrl}${config.authEndpoint}${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
};

/**
 * Get countries API endpoint URL
 * @param {string} path - The API path
 * @returns {string} - Full URL for countries endpoint
 */
export const getCountriesApiUrl = (path) => {
  // Ensure path is a string
  const pathStr = String(path || '');
  return `${config.apiBaseUrl}/countries${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
};

/**
 * Make a blog API GET request using apiClient
 * @param {string} path - The API path relative to blog endpoint
 * @param {Object} options - Request options
 * @returns {Promise} - Response from the request
 */
export const blogApiGet = async (path, options = {}) => {
  const { url } = getBlogApiUrl(path);
  console.log(`Making GET request to: ${url}`);
  return apiClient.get(url, options);
};

/**
 * Make a blog API POST request using apiClient
 * @param {string} path - The API path relative to blog endpoint
 * @param {Object} data - The data to send
 * @param {Object} options - Request options
 * @returns {Promise} - Response from the request
 */
export const blogApiPost = async (path, data = {}, options = {}) => {
  const { url } = getBlogApiUrl(path);
  console.log(`Making POST request to: ${url}`);
  return apiClient.post(url, data, options);
};

/**
 * Make a blog API PUT request using apiClient
 * @param {string} path - The API path relative to blog endpoint
 * @param {Object} data - The data to send
 * @param {Object} options - Request options
 * @returns {Promise} - Response from the request
 */
export const blogApiPut = async (path, data = {}, options = {}) => {
  const { url } = getBlogApiUrl(path);
  console.log(`Making PUT request to: ${url}`);
  return apiClient.put(url, data, options);
};

/**
 * Make a blog API DELETE request using apiClient
 * @param {string} path - The API path relative to blog endpoint
 * @param {Object} options - Request options
 * @returns {Promise} - Response from the request
 */
export const blogApiDelete = async (path, options = {}) => {
  const { url } = getBlogApiUrl(path);
  console.log(`Making DELETE request to: ${url}`);
  return apiClient.delete(url, options);
};