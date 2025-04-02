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
  : ['http://localhost:3000', 'https://illustrious-nougat-89c023.netlify.app'];

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
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server with a small delay to allow database initialization
const PORT = process.env.PORT || 5000;
setTimeout(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}, 5000); // 5 second delay to give database initialization time to complete 