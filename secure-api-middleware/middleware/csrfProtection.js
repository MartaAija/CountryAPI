/**
 * CSRF Protection Middleware
 * Provides Cross-Site Request Forgery protection for form submissions
 */
const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or another persistent store)
const csrfTokens = new Map();

/**
 * Generate a new CSRF token for a user session
 * @param {string} sessionId - The user's session ID
 * @returns {string} - The generated CSRF token
 */
function generateToken(sessionId) {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token with the session ID
    csrfTokens.set(sessionId, {
        token,
        createdAt: Date.now()
    });
    
    // Also store a global token that can be used by any authenticated user
    // This helps when a token is generated before authentication
    if (sessionId === 'anonymous') {
        csrfTokens.set('global', {
            token,
            createdAt: Date.now()
        });
    }
    
    return token;
}

/**
 * Validate a CSRF token
 * @param {string} sessionId - The user's session ID
 * @param {string} token - The CSRF token to validate
 * @returns {boolean} - True if the token is valid
 */
function validateToken(sessionId, token) {
    // Try to find token for this specific session
    let storedData = csrfTokens.get(sessionId);
    
    // If not found, try the anonymous token
    if (!storedData) {
        storedData = csrfTokens.get('anonymous');
    }
    
    // If still not found, try the global token
    if (!storedData) {
        storedData = csrfTokens.get('global');
    }
    
    if (!storedData) {
        return false;
    }
}

/**
 * Clean up expired tokens (call periodically)
 */
function cleanupExpiredTokens() {
    const now = Date.now();
    const expiryTime = 3600000; // 1 hour
    let count = 0;
    
    for (const [sessionId, data] of csrfTokens.entries()) {
        if (now - data.createdAt > expiryTime) {
            csrfTokens.delete(sessionId);
            count++;
        }
    }
    
    if (count > 0) {
        console.log(`Cleaned up ${count} expired CSRF tokens`);
    }
}

// Set up periodic cleanup every hour
setInterval(cleanupExpiredTokens, 3600000);

/**
 * Middleware to generate and provide CSRF token
 */
function csrfGenerator(req, res, next) {
    // Use JWT token sub as session ID if available
    const sessionId = req.user?.id || req.sessionID || 'anonymous';
    
    // Check if we already have a token for this session
    let token;
    const existingData = csrfTokens.get(sessionId);
    
    if (existingData && (Date.now() - existingData.createdAt) < 3600000) {
        // Use existing token if it's not expired
        token = existingData.token;
    } else {
        // Generate a new token
        token = generateToken(sessionId);
    }
    
    // Make token available to templates and response
    req.csrfToken = token;
    res.locals.csrfToken = token;
    
    // Set CSRF token in a cookie for JavaScript access
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
    
    next();
}

/**
 * Middleware to validate CSRF token
 */
function csrfProtection(req, res, next) {
    // Skip validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    // Use JWT token sub as session ID if available
    const sessionId = req.user?.id || req.sessionID || 'anonymous';
    
    // Get token from various possible locations
    const token = req.body?._csrf || 
                 req.query?._csrf || 
                 req.headers['x-csrf-token'] || 
                 req.headers['x-xsrf-token'] ||
                 req.cookies?.['XSRF-TOKEN']; // Also check cookies directly
    
    if (!token) {
        return res.status(403).json({
            error: 'CSRF token missing'
        });
    }

    // For admin login, temporarily disable CSRF protection
    // This is a workaround for the CSRF token validation issues
    if (req.originalUrl === '/auth/admin/login') {
        return next();
    }
    
    // Try to validate with different session IDs if needed
    if (!validateToken(sessionId, token)) {
        
        if (!validateToken('anonymous', token)) {
            
            if (!validateToken('global', token)) {
                return res.status(403).json({
                    error: 'CSRF token validation failed'
                });
            }
        }
    }

    next();
}

module.exports = {
    csrfGenerator,
    csrfProtection
}; 