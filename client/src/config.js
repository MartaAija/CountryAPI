// Central configuration file for environment-specific settings
const config = {
  // API base URL - use environment variable with localhost as fallback
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://countryapi-production-3382.up.railway.app' 
    : 'http://localhost:5000',
  
  // Additional configuration variables can be added here
  authEndpoint: '/auth',
  countriesEndpoint: '/api/countries'
};

export default config; 
