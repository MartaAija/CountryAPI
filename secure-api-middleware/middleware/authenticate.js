/**
 * JWT Authentication Middleware
 * This middleware validates JSON Web Tokens (JWT) for protected routes.
 * It ensures that only authenticated users can access certain API endpoints.
 */
const jwt = require("jsonwebtoken");      // Library for JWT verification
require("dotenv").config();                // Load environment variables for secret key

// Define the admin token value - should match what's used in the client
const ADMIN_TOKEN = 'admin-token';

/**
 * Middleware function to verify JWT tokens
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header or cookies
 * 2. Verifies its signature using the JWT_SECRET
 * 3. Attaches the decoded user information to the request
 * 4. Allows or denies access to protected routes
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = (req, res, next) => {
    // First try to get token from HttpOnly cookie
    let token = req.cookies?.auth_token;
    
    // If no token in cookie, try Authorization header as fallback
    if (!token) {
    // Extract token from Authorization header
    // The header format should be: Authorization: Bearer <token>
        token = req.headers.authorization?.split(" ")[1];
    }

    // If no token is provided, deny access immediately
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the token's signature and expiration
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-jwt-secret', (err, decoded) => {
        // If verification fails (invalid or expired token), deny access
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        
        // Check for admin claim in token
        if (decoded.isAdmin === true) {
            req.user = { id: 0, username: 'admin', isAdmin: true };
            return next();
        }
        
        // If token is valid, attach the decoded user data to the request
        // This makes user information available to subsequent route handlers
        req.user = decoded;
        
        // Proceed to the actual route handler
        next();
    });
}; 