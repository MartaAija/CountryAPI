import axios from "axios";
import config from "../../config";

// Use config for base URL instead of hardcoded value
const API_BASE_URL = `${config.apiBaseUrl}${config.authEndpoint}`; 

/**
 * Register a new user with the API
 * @param {Object} userData - Contains username, password, first_name, last_name
 * @returns {Promise} Axios response with API key and success message
 */
export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/signup`, userData);
        return response;
    } catch (error) {
        throw error;
    }
};

/**
 * Authenticate user with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise} Axios response with authentication token
 */
export const loginUser = async (username, password) => {
    return axios.post(`${API_BASE_URL}/login`, { username, password });
};

/**
 * Fetch the current user's profile data
 * Uses the JWT token from localStorage for authentication
 * @returns {Promise} Axios response with user profile information
 */
export const getProfile = async () => {
    const token = localStorage.getItem("token");
    return axios.get(`${API_BASE_URL}/profile`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};
