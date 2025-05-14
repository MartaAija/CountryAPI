/**
 * Main Application Entry Point
 * Sets up Express server with middleware, routes, and error handling
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { csrfGenerator, csrfProtection } = require('./middleware/csrfProtection');
const { sanitizeRequestBody } = require('./utils/sanitizer');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const countryRoutes = require('./routes/countryRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import User Model to initialize verification schema
const UserDAO = require('./models/UserDAO');
// UserDAO is already an instance, no need to create a new one

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://flagcdn.com", "https://restcountries.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", process.env.NODE_ENV === 'production' 
        ? "https://country-explorer-w1888516.netlify.app" 
        : "http://localhost:3000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  // Enable strict transport security
  hsts: {
    maxAge: 15552000, // 180 days
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration - Allow requests from any origin during development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://traveltalesblog.netlify.app'] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token', 'X-XSRF-Token'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'));
app.use(apiLimiter);

// Apply sanitization middleware to all routes
app.use(sanitizeRequestBody);

// Log cookies for debugging
app.use((req, res, next) => {
  console.log('Cookies received:', req.cookies ? Object.keys(req.cookies) : 'No cookies');
  next();
});

// Generate CSRF token for all routes
app.use(csrfGenerator);

// Root route - provide CSRF token
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API is running',
    version: '1.0.0',
    documentation: '/docs',
    csrfToken: req.csrfToken // Provide CSRF token for client-side use
  });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/blog', blogRoutes);
app.use('/countries', countryRoutes);
app.use('/admin', adminRoutes);
    
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
(async () => {
  try {
    // Initialize email verification fields in the database
    await UserDAO.updateSchema();
  } catch (error) {
    console.error('Error initializing email verification schema:', error);
  }
})();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', message: 'The requested resource does not exist' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 