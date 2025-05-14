/**
 * Token Service Module
 * Handles generation and verification of security tokens
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || JWT_SECRET;
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || JWT_SECRET;
const PASSWORD_CHANGE_SECRET = process.env.PASSWORD_CHANGE_SECRET || JWT_SECRET;
const EMAIL_CHANGE_SECRET = process.env.EMAIL_CHANGE_SECRET || JWT_SECRET;

/**
 * Generate a secure random token
 * @param {number} length - Length of the token
 * @returns {string} - Random token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a verification token for email verification
 * @param {Object} payload - Data to include in the token
 * @returns {string} - JWT token
 */
function generateVerificationToken(payload) {
    return jwt.sign(payload, EMAIL_VERIFICATION_SECRET, { expiresIn: '24h' });
}

/**
 * Generate a password reset token
 * @param {Object} payload - Data to include in the token
 * @returns {string} - JWT token
 */
function generatePasswordResetToken(payload) {
    return jwt.sign(payload, PASSWORD_RESET_SECRET, { expiresIn: '1h' });
}

/**
 * Generate a password change token
 * @param {Object} payload - Data to include in the token (userId, email, newPassword)
 * @returns {string} - JWT token
 */
function generatePasswordChangeToken(payload) {
    return jwt.sign(payload, PASSWORD_CHANGE_SECRET, { expiresIn: '1h' });
}

/**
 * Generate an email change token
 * @param {Object} payload - Data to include in the token (userId, currentEmail, newEmail)
 * @returns {string} - JWT token
 */
function generateEmailChangeToken(payload) {
    return jwt.sign(payload, EMAIL_CHANGE_SECRET, { expiresIn: '1h' });
}

/**
 * Verify a token
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type ('email_verification', 'password_reset', 'password_change', 'email_change')
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token, type = 'email_verification') {
    try {
        let secret;
        
        // Select appropriate secret based on token type
        switch (type) {
            case 'email_verification':
                secret = EMAIL_VERIFICATION_SECRET;
                break;
            case 'password_reset':
                secret = PASSWORD_RESET_SECRET;
                break;
            case 'password_change':
                secret = PASSWORD_CHANGE_SECRET;
                break;
            case 'email_change':
                secret = EMAIL_CHANGE_SECRET;
                break;
            default:
                secret = JWT_SECRET;
        }
        
        // Verify token with selected secret
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        console.error(`Token verification failed for ${type}:`, error.message);
        return null;
    }
}

module.exports = {
    generateRandomToken,
    generateVerificationToken,
    generatePasswordResetToken,
    generatePasswordChangeToken,
    generateEmailChangeToken,
    verifyToken
}; 