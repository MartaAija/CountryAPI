/**
 * Main Application Entry Point
 * Initializes and configures the Secure Country API service
 */
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const countryRoutes = require('./routes/countryRoutes');
require('dotenv').config();  // Load environment variables from .env file

// Initialize Express application
const app = express();

// Get allowed origins from environment or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

//CORS configuration to allow requests from Railway
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Apply middleware
app.use(express.json());  // Parse JSON request bodies

// Register route modules
app.use('/auth', authRoutes);  // Authentication routes mounted at /auth
app.use('/api/countries', countryRoutes);  // Country data routes mounted at /api/countries

// Basic root route for service health check
app.get('/', (req, res) => {
    res.send('Secure API Middleware is running...');
});

// Add proper error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5000;  // Use environment port or default to 5000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 