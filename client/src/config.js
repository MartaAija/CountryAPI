// Central configuration file for environment-specific settings
const config = {
  // API base URL - use environment variable with localhost as fallback
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://countryapi-production-5484.up.railway.app' 
    : 'http://localhost:5000',
  
  // Additional configuration variables 
  authEndpoint: '/auth',
  countriesEndpoint: '/api/countries',
  blogEndpoint: '/blog' 
};

export default config; 
