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
  
  // Format the path to match the backend routes structure
  if (pathStr.startsWith('/api/blog/')) {
    // Convert /api/blog/posts to /blog/api/posts
    url = `${config.apiBaseUrl}/blog${pathStr.substring(9)}`;
  } else if (pathStr.startsWith('/blog/api/')) {
    // Already in the correct format
    url = `${config.apiBaseUrl}${pathStr}`;
  } else if (!pathStr.startsWith('/blog/')) {
    // If it doesn't start with /blog/, add it
    url = `${config.apiBaseUrl}/blog${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
  } else {
    // If it's already in the correct format
    url = `${config.apiBaseUrl}${pathStr}`;
  }
  
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
  return apiClient.get(url.replace(config.apiBaseUrl, ''), options);
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
  return apiClient.post(url.replace(config.apiBaseUrl, ''), data, options);
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
  return apiClient.put(url.replace(config.apiBaseUrl, ''), data, options);
};

/**
 * Make a blog API DELETE request using apiClient
 * @param {string} path - The API path relative to blog endpoint
 * @param {Object} options - Request options
 * @returns {Promise} - Response from the request
 */
export const blogApiDelete = async (path, options = {}) => {
  const { url } = getBlogApiUrl(path);
  return apiClient.delete(url.replace(config.apiBaseUrl, ''), options);
};