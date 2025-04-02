// Central configuration file for environment-specific settings
const config = {
  // API base URL - use environment variable with localhost as fallback
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  
  // Additional configuration variables can be added here
  authEndpoint: '/auth',
  countriesEndpoint: '/api/countries'
};

export default config; 


// Rest of your server setup...