/**
 * API Key Verification Middleware
 * This middleware validates and tracks usage of API keys before allowing access to protected endpoints.
 * It supports both primary and secondary API keys and updates their last used timestamps.
 */
const UserDAO = require("../models/UserDAO"); // User DAO for verifying API keys

/**
 * Middleware function to verify API keys
 * This middleware:
 * 1. Extracts the API key from request headers
 * 2. Validates the key against the database
 * 3. Updates the "last used" timestamp for usage tracking
 * 4. Allows or denies access to the protected route
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = async (req, res, next) => {
    // Extract API key from custom header
    const apiKey = req.headers['x-api-key'];
    
    // Public paths that can be accessed without API key
    const publicPaths = [
        '/posts',          // Public access to blog posts list
        '/posts/'          // Public access to individual blog post
    ];
    
    // Check if the request path matches any of the public paths
    const isPublicPath = publicPaths.some(path => 
        req.path === path || req.path.startsWith(path) && req.method === 'GET'
    );
    
    // Allow access to public paths without an API key
    if (isPublicPath) {
        return next();
    }
    
    // Check if API key is provided for protected paths
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        // Verify API key and update last used timestamp
        const result = await UserDAO.verifyApiKey(apiKey);
        
        // If no matching active key is found, deny access
        if (!result) {
            return res.status(401).json({ error: 'Invalid or inactive API key' });
        }

        // Set user ID in request for potential future use
        req.userId = result.userId;

        // API key is valid and timestamp updated, proceed to the actual route handler
        next();
    } catch (error) {
        console.error('API Key Verification Error:', error);
        res.status(500).json({ error: 'Server error during API key verification' });
    }
}; 