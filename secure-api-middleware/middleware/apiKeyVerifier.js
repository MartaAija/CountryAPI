/**
 * API Key Verification Middleware
 * This middleware validates and tracks usage of API keys before allowing access to protected endpoints.
 * It supports both primary and secondary API keys and updates their last used timestamps.
 */
const db = require("../config/db"); // Database connection for verifying keys and updating usage

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
    
    // Check if API key is provided
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        // Query database to verify if the API key exists and is active
        // Note: Checks both primary and secondary keys with a single query
        const [rows] = await db.query(
            `SELECT id, api_key_primary, is_active_primary, api_key_secondary, is_active_secondary 
             FROM users 
             WHERE (api_key_primary = ? AND is_active_primary = 1) 
             OR (api_key_secondary = ? AND is_active_secondary = 1)`,
            [apiKey, apiKey]
        );

        // If no matching active key is found, deny access
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or inactive API key' });
        }

        // Determine which key was used (primary or secondary) and update its usage timestamp
        const user = rows[0];
        if (apiKey === user.api_key_primary) {
            // Update last_used timestamp for primary key
            await db.query(
                'UPDATE users SET last_used_primary = NOW() WHERE id = ?',
                [user.id]
            );
        } else if (apiKey === user.api_key_secondary) {
            // Update last_used timestamp for secondary key
            await db.query(
                'UPDATE users SET last_used_secondary = NOW() WHERE id = ?',
                [user.id]
            );
        }

        // API key is valid and timestamp updated, proceed to the actual route handler
        next();
    } catch (error) {
        // Return a generic error to the client
        res.status(500).json({ error: 'Internal server error' });
    }
}; 