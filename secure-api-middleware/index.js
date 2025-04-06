/**
 * Main Application Entry Point
 * Initializes and configures the Secure Country API service
 */
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const countryRoutes = require('./routes/countryRoutes');
require('dotenv').config();  // Load environment variables from .env file
const pool = require('./config/db');

// Initialize Express application
const app = express();

// Get allowed origins from environment or use defaults with Netlify domain
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'https://illustrious-nougat-89c023.netlify.app'];

// More flexible CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'development') {
      // In development, allow all origins
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      // Log the rejected origin for debugging
      console.warn(`Origin ${origin} not allowed by CORS`);
      return callback(null, true); // Temporarily allowing all origins
    }
    
    return callback(null, true);
  },
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

// Update your health endpoint with more details
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const [result] = await pool.query('SELECT 1 as test');
    
    // List tables
    const [tables] = await pool.query('SHOW TABLES');
    
    // Get database info
    const [dbInfo] = await pool.query('SELECT DATABASE() as db');
    
    res.json({
      status: 'ok',
      database: {
        connected: true,
        name: dbInfo[0].db,
        tables: tables.map(row => Object.values(row)[0]),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
        allowedOrigins: process.env.ALLOWED_ORIGINS,
        port: process.env.PORT
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// Add proper error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server with a small delay to allow database initialization
const PORT = process.env.PORT || 5000;
setTimeout(() => {
  app.listen(PORT, () => {
  });
}, 5000); // 5 second delay to give database initialization time to complete 