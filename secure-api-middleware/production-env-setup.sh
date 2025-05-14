#!/bin/bash

# Script to set production environment variables for the TravelTales API

# Set environment to production
export NODE_ENV=production

# Set frontend URL for email links
export FRONTEND_URL=https://traveltalesblog.netlify.app

# Set backend URL
export API_URL=https://countryapi-production-5484.up.railway.app

# TLS/SSL settings
export TLS_REJECT_UNAUTHORIZED=true

# Log the environment
echo "Environment set to PRODUCTION"
echo "Frontend URL: $FRONTEND_URL"
echo "API URL: $API_URL"

# Run the application
node index.js 