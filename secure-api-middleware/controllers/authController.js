/**
 * Authentication Controller Module
 * Handles all authentication-related business logic including:
 * - User registration and login
 * - Profile management
 * - API key generation and management
 * - Admin user management
 */

const bcrypt = require("bcryptjs");      // Library for password hashing
const jwt = require("jsonwebtoken");      // JWT for stateless authentication
const UserDAO = require("../models/UserDAO");  // User Data Access Object
const { checkCooldown, updateCooldown } = require("../utils/apiKeyGenerator"); // API key utilities
const mailService = require("../utils/mailService"); // Email service
const tokenService = require("../utils/tokenService"); // Token service
const securityLogger = require("../utils/logger"); // Security logger
const { sanitizeUsername, sanitizeEmail, sanitizeString } = require("../utils/sanitizer"); // Input sanitization

/**
 * User Registration Handler
 * Creates a new user account with hashed password and sends verification email
 */
async function registerUser(req, res) {
    try {
        
        // Sanitize inputs
        const username = sanitizeUsername(req.body.username);
        const email = sanitizeEmail(req.body.email);
        const first_name = sanitizeString(req.body.first_name);
        const last_name = sanitizeString(req.body.last_name);
        const password = req.body.password; // Don't sanitize passwords as they will be hashed
        
        // Validate sanitized inputs
        if (!username || username !== req.body.username) {
            return res.status(400).json({ error: "Invalid username format" });
        }
        
        if (!email || email !== req.body.email.trim().toLowerCase()) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        
        // Check if username already exists
        const existingUser = await UserDAO.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }
        
        // Check if email already exists
        const existingEmail = await UserDAO.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: "Email already in use" });
        }
        
        // Create new user record with is_verified set to false
        const newUser = await UserDAO.registerUser({
            username,
            password,
            email,
            first_name,
            last_name
        });
        
        
        // Generate verification token
        const verificationToken = tokenService.generateVerificationToken({
            userId: newUser.id,
            email: newUser.email
        });
        
        // Store token in database
        await UserDAO.createVerificationToken(newUser.id, verificationToken);
        
        // Send verification email
        const emailResult = await mailService.sendVerificationEmail(email, verificationToken, newUser.id);
        if (!emailResult.success) {
            // Log the error but continue with registration
            // Error is handled by the security logger
        }
        
        // Generate token for immediate login, but with short expiry
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: "15m" } // Short expiry until verified
        );
        
        // Return success with user ID and token
        res.status(201).json({ 
            message: "User registered successfully. Please check your email to verify your account.",
            userId: newUser.id,
            username: newUser.username,
            token,
            verified: false
        });
    } catch (err) {
        // Error handling with specific error message
        console.error('Registration error:', err);
        res.status(500).json({ error: "Database error: " + err.message });
    }
}

/**
 * User Login Handler
 * Authenticates a user and provides a JWT token for subsequent requests
 */
async function loginUser(req, res) {
    try {
        
        // Sanitize username before processing
        const username = sanitizeUsername(req.body.username);
        const password = req.body.password; // Don't sanitize passwords
        
        // Validate sanitized username
        if (!username || username !== req.body.username) {
            return res.status(401).json({ error: "Invalid username format" });
        }
        
        // Log login attempt
        securityLogger.logAuthEvent('login_attempt', {
            username,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        // Find user by username
        const user = await UserDAO.findByUsername(username);

        // User not found
        if (!user) {
            
            // Log failed login attempt
            securityLogger.logSecurityViolation('login_failure', {
                username,
                reason: 'User not found',
                ip: req.ip
            });
            
            return res.status(401).json({ error: "Invalid username or password" });
        }
        
        // Verify password using bcrypt compare
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            
            // Log failed login attempt
            securityLogger.logSecurityViolation('login_failure', {
                username,
                userId: user.id,
                reason: 'Password mismatch',
                ip: req.ip
            });
            
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if email is verified
        const isVerified = await UserDAO.isEmailVerified(user.id);
        if (!isVerified) {
            
            // Log verification required
            securityLogger.logAuthEvent('login_verification_required', {
                username,
                userId: user.id,
                ip: req.ip
            });
            
            return res.status(403).json({ 
                error: "Email not verified. Please check your inbox and verify your email before logging in."
            });
        }

        // Create JWT token with user information
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET || 'fallback-jwt-secret',
            { expiresIn: "1h" } // Normal expiry for verified users
        );
        
        // Set token in HttpOnly cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 3600000 // 1 hour
        });
        
        // Log successful login
        securityLogger.logAuthEvent('login_success', {
            username,
            userId: user.id,
            ip: req.ip
        });
        
        // Return success with token and userId (for backward compatibility)
        res.json({ 
            message: "Login successful!", 
            token,
            userId: user.id,
            username: user.username,
            verified: true
        });
    } catch (err) {
        console.error('Login error:', err);
        
        // Log error
        securityLogger.logSecurityViolation('login_error', {
            error: err.message,
            ip: req.ip
        });
        
        res.status(500).json({ error: "Database error: " + err.message });
    }
}

/**
 * Email Verification Handler
 * Verifies a user's email address using the token sent to their email
 */
async function verifyEmail(req, res) {
    try {
        const { token, userId } = req.query;
        
        if (!token || !userId) {
            return res.status(400).json({ error: "Missing token or userId" });
        }
        
        // First check if the user is already verified
        const isAlreadyVerified = await UserDAO.isEmailVerified(userId);
        
        if (isAlreadyVerified) {
            // User is already verified, generate a token and return success
            const user = await UserDAO.findById(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            
            // Generate new token with longer expiry
            const newToken = jwt.sign(
                { id: userId, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            
            // Set token in HttpOnly cookie
            res.cookie('auth_token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 3600000 // 1 hour
            });
            
            // Send success response with token
            return res.status(200).json({
                message: "Your email is already verified. You can now login.",
                token: newToken,
                verified: true
            });
        }
        
        // Otherwise verify the token
        const verification = await UserDAO.verifyEmail(userId, token);
        
        if (!verification) {
            // Invalid or expired token
            return res.status(400).json({ error: "Invalid or expired verification token" });
        }
        
        // Get user data
        const user = await UserDAO.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Generate new token with longer expiry now that email is verified
        const newToken = jwt.sign(
            { id: userId, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        
        // Set token in HttpOnly cookie
        res.cookie('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 3600000 // 1 hour
        });
        
        // Send success response with token
        res.status(200).json({
            message: "Email verification successful! You can now login.",
            token: newToken,
            verified: true
        });
        
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: "Server error during verification" });
    }
}

/**
 * Resend Verification Email Handler
 * Resends the verification email to the user
 */
async function resendVerificationEmail(req, res) {
    try {
        const userId = req.user.id;
        
        // Get user details
        const user = await UserDAO.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Check if already verified
        const isVerified = await UserDAO.isEmailVerified(userId);
        if (isVerified) {
            return res.status(400).json({ error: "Email already verified" });
        }
        
        // Generate new verification token
        const verificationToken = tokenService.generateVerificationToken({
            userId: user.id,
            email: user.email
        });
        
        // Update token in database
        await UserDAO.createVerificationToken(userId, verificationToken);
        
        // Send verification email
        await mailService.sendVerificationEmail(user.email, verificationToken, userId);
        
        res.json({ message: "Verification email resent successfully" });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
}

/**
 * Forgot Password Handler
 * Generates a password reset token and sends reset email
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        
        // Generate reset token
        const resetToken = tokenService.generatePasswordResetToken({ email });
        
        // Create password reset token in database
        const user = await UserDAO.createPasswordResetToken(email, resetToken);
        
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({ message: "If your email is registered, you'll receive a password reset link shortly" });
        }
        
        // Send password reset email
        await mailService.sendPasswordResetEmail(email, resetToken, user.id);
        
        res.json({ message: "Password reset instructions sent to your email" });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: "Server error" });
    }
}

/**
 * Reset Password Handler
 * Validates reset token and updates user's password
 */
async function resetPassword(req, res) {
    try {
        const { token, userId, password } = req.body;
        
        if (!token || !userId || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Verify token
        const decoded = tokenService.verifyToken(token, 'password_reset');
        if (!decoded) {
            return res.status(400).json({ error: "Invalid or expired reset link" });
        }
        
        // Verify token in database
        const user = await UserDAO.verifyPasswordResetToken(userId, token);
        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset link" });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password
        const updated = await UserDAO.resetPassword(userId, hashedPassword);
        if (!updated) {
            return res.status(500).json({ error: "Failed to update password" });
        }
        
        // Send confirmation email
        await mailService.sendPasswordChangeConfirmation(user.email);
        
        res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: "Server error" });
    }
}

// Get User Profile
async function getUserProfile(req, res) {
    try {
        const userId = req.user.id;
        const user = await UserDAO.getUserWithProfileAndKeys(userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
}

// Update User Profile
async function updateUserProfile(req, res) {
    try {
        const userId = req.user.id;
        const { first_name, last_name } = req.body;
        
        // Basic validation
        if (!first_name && !last_name) {
            return res.status(400).json({ error: "No fields to update" });
        }
        
        // Update the profile
        await UserDAO.update(userId, { first_name, last_name });
        
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
}

// Change Password
async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        
        // Validate input
        if (!current_password || !new_password) {
            return res.status(400).json({ error: "Current and new password are required" });
        }
        
        // Get user
        const user = await UserDAO.findById(userId);
        
        // Verify current password
        const passwordMatch = await bcrypt.compare(current_password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Generate password change token
        const passwordChangeToken = tokenService.generatePasswordChangeToken({
            userId: user.id,
            newPassword: new_password
        });
        
        // Store token in database
        await UserDAO.createPasswordChangeToken(userId, passwordChangeToken);
        
        // Send password change verification email
        await mailService.sendPasswordChangeVerificationEmail(user.email, passwordChangeToken, userId);

        res.json({ message: "Password change verification sent to your email" });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: "Failed to process password change request" });
    }
}

/**
 * Change Email Handler
 * Initiates email change process with verification
 */
async function changeEmail(req, res) {
    try {
        const userId = req.user.id;
        const { current_email, new_email } = req.body;
        
        // Validate input
        if (!current_email || !new_email) {
            return res.status(400).json({ error: "Current and new email addresses are required" });
        }
        
        // Get user
        const user = await UserDAO.findById(userId);
        
        // Verify current email matches user's email
        if (current_email !== user.email) {
            return res.status(401).json({ error: "Current email does not match your account" });
        }
        
        // Check if new email already exists
        const existingEmail = await UserDAO.findByEmail(new_email);
        if (existingEmail) {
            return res.status(400).json({ error: "Email already in use by another account" });
        }
        
        // Generate email change token
        const emailChangeToken = tokenService.generateEmailChangeToken({
            userId: user.id,
            currentEmail: current_email,
            newEmail: new_email
        });
        
        // Store token in database
        await UserDAO.createEmailChangeToken(userId, emailChangeToken);
        
        // Send email change verification email to new email
        await mailService.sendEmailChangeVerificationEmail(new_email, emailChangeToken, userId);
        
        res.json({ message: "Email change verification sent to your new email address" });
    } catch (err) {
        console.error('Email change error:', err);
        res.status(500).json({ error: "Failed to process email change request" });
    }
}

/**
 * Verify Email Change Handler
 * Validates token and updates user's email
 */
async function verifyEmailChange(req, res) {
    try {
        const { token, userId } = req.query;
        
        if (!token || !userId) {
            return res.status(400).json({ error: "Missing token or userId" });
        }
        
        // Verify token
        const decoded = tokenService.verifyToken(token, 'email_change');
        if (!decoded || decoded.userId != userId) {
            return res.status(400).json({ error: "Invalid or expired email change link" });
        }
        
        // Update email
        const updated = await UserDAO.updateEmail(userId, decoded.newEmail);
        if (!updated) {
            return res.status(500).json({ error: "Failed to update email" });
        }
        
        // Send confirmation email to both old and new addresses
        await mailService.sendEmailChangeConfirmation(decoded.currentEmail, decoded.newEmail);
        
        // Return success with logout flag
        res.json({ 
            message: "Email changed successfully. Please log in with your new email.",
            logout: true
        });
    } catch (err) {
        console.error('Email change verification error:', err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
}

// Generate new API Key
async function generateNewApiKey(req, res) {
    try {
        const userId = req.user.id;
        const { key_type } = req.body; // 'primary' or 'secondary'
        
        if (!key_type) {
            return res.status(400).json({ error: "key_type is required (must be 'primary' or 'secondary')" });
        }
        
        // Check cooldown period
        const cooldown = checkCooldown(userId, key_type);
        if (cooldown.onCooldown) {
            return res.status(429).json({ error: cooldown.message });
        }
        
        // Generate new API key
        const apiKey = await UserDAO.generateNewApiKey(userId, key_type);
        
        // Update the cooldown timestamp
        updateCooldown(userId, key_type);

        res.json({ 
            message: `New ${key_type} API Key generated successfully`,
            apiKey: apiKey
        });
    } catch (err) {
        console.error('Error generating API key:', err);
        res.status(500).json({ error: "Failed to generate API key: " + (err.message || "Unknown error") });
    }
}

/**
 * API Key Status Toggle Handler
 * Enable or disable a user's API key without deleting it
 */
async function toggleApiKeyStatus(req, res) {
    const { userId } = req.params;
    const { key_type, active } = req.body;
    
    // Sanitize and validate inputs
    if (!userId || !key_type) {
        return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // Ensure the user can only modify their own API key unless they're an admin
    if (req.user.id != userId && !req.user.isAdmin) {
        return res.status(403).json({ error: "You can only modify your own API keys" });
    }
    
    // Parse the active flag with a default of false if not specified
    const newStatus = active === true || active === 'true';

    try {
        // Update the key status
        const result = await UserDAO.updateApiKeyStatus(userId, key_type, newStatus);
        
        if (!result) {
            return res.status(404).json({ error: "API key not found" });
        }
        
        res.json({ 
            message: `API key ${newStatus ? 'activated' : 'deactivated'} successfully`,
            key_type,
            active: newStatus
        });
    } catch (error) {
        console.error('Error toggling API key status:', error);
        res.status(500).json({ error: "Database error: " + error.message });
    }
}

// Get user's API keys
async function getUserApiKeys(req, res) {
    try {
        const userId = req.user.id;
        const apiKeys = await UserDAO.getUserApiKeys(userId);
        
        res.json(apiKeys);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch API keys" });
    }
}

// Admin: Get All Users
async function getAllUsers(req, res) {
    try {
        const users = await UserDAO.getAllUsersWithProfileAndKeys();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
}

// Admin: Delete User
async function deleteUser(req, res) {
    try {
        const { userId } = req.params;
        
        // Delete user
        const success = await UserDAO.delete(userId);
        
        if (!success) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
}

// Delete API Key
async function deleteApiKey(req, res) {
    try {
        const currentUserId = req.user.id;
        const { userId } = req.params;
        const { key_type } = req.query; // Get key_type from query parameters
        
        // Validate input
        if (!key_type) {
            return res.status(400).json({ error: "key_type is required" });
        }
        
        // Security check: Users can only delete their own API keys
        if (parseInt(userId) !== currentUserId) {
            return res.status(403).json({ error: "You can only delete your own API keys" });
        }
        
        // Delete the API key by setting it to null
        await UserDAO.executeQuery(
            `DELETE FROM api_keys WHERE user_id = ? AND key_type = ?`,
            [currentUserId, key_type]
        );
        
        // Get updated user data
        const updatedUser = await UserDAO.getUserWithProfileAndKeys(currentUserId);
        
        res.json({ 
            message: `API Key deleted successfully`,
            success: true,
            user: updatedUser
        });
    } catch (err) {
        console.error("Error deleting API key:", err);
        res.status(500).json({ error: "Failed to delete API key" });
    }
}

/**
 * Verify Password Change Handler
 * Validates token and updates user's password
 */
async function verifyPasswordChange(req, res) {
    try {
        const { token, userId } = req.query;
        
        if (!token || !userId) {
            return res.status(400).json({ error: "Missing token or userId" });
        }
        
        // Verify token
        const decoded = tokenService.verifyToken(token, 'password_change');
        if (!decoded || decoded.userId != userId) {
            return res.status(400).json({ error: "Invalid or expired password change link" });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(decoded.newPassword, 10);
        
        // Update password
        const updated = await UserDAO.update(userId, { password_hash: hashedPassword });
        if (!updated) {
            return res.status(500).json({ error: "Failed to update password" });
        }
        
        // Send confirmation email
        const user = await UserDAO.findById(userId);
        await mailService.sendPasswordChangeConfirmation(user.email);
        
        // Return success with logout flag
        res.json({ 
            message: "Password changed successfully. Please log in with your new password.",
            logout: true
        });
    } catch (err) {
        console.error('Password change verification error:', err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
}

/**
 * Admin login handler
 * Authenticates admin credentials and returns a token
 */
async function adminLogin(req, res) {
  try {
    
    const { username, password } = req.body;
    
    // Log authentication attempt
    securityLogger.logAuthEvent('admin_login_attempt', {
      username,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Basic validation
    if (!username || !password) {
      securityLogger.logSecurityViolation('invalid_admin_login', {
        reason: 'Missing username or password',
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }
    
    // Get admin credentials from environment variables
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Validate admin credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      
      // Log successful login
      securityLogger.logAuthEvent('admin_login_success', {
        username,
        ip: req.ip
      });
      
      // Generate a secure JWT token for admin
      const jwt = require('jsonwebtoken');
      const adminToken = jwt.sign(
        { id: 'admin', username: 'admin', isAdmin: true },
        process.env.JWT_SECRET || 'fallback-jwt-secret',
        { expiresIn: '1h' }
      );
      
      // Set token in HttpOnly cookie
      res.cookie('auth_token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3600000 // 1 hour
      });
      
      // Return success response with token (for backward compatibility)
      return res.json({
        success: true,
        token: adminToken,
        isAdmin: true
      });
    }
    
    // Log failed login attempt
    securityLogger.logSecurityViolation('admin_login_failure', {
      username,
      reason: 'Invalid credentials',
      ip: req.ip
    });
    
    return res.status(401).json({
      error: 'Invalid admin credentials'
    });
  } catch (error) {
    console.error('[adminLogin] Error:', error);
    
    // Log error
    securityLogger.logSecurityViolation('admin_login_error', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Logout handler
 * Clears authentication cookies
 */
async function logout(req, res) {
  try {
    // Log logout event
    if (req.user) {
      securityLogger.logAuthEvent('logout', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip
      });
    } else {
      securityLogger.logAuthEvent('logout', {
        ip: req.ip,
        note: 'No user in request'
      });
    }
    
    // Clear the auth token cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });
    
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('[logout] Error:', error);
    
    // Log error
    securityLogger.logSecurityViolation('logout_error', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * Check Session Handler
 * Validates if the user has a valid session via HttpOnly cookie
 */
async function checkSession(req, res) {
  try {
    // If the authenticate middleware has passed, the user is authenticated
    if (req.user) {
      return res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          isAdmin: !!req.user.isAdmin
        }
      });
    }
    
    // If no user object is attached to the request, the session is invalid
    return res.json({ authenticated: false });
  } catch (error) {
    console.error('[checkSession] Error:', error);
    return res.status(500).json({ error: 'Server error', authenticated: false });
  }
}

/**
 * Check Admin Status Handler
 * Validates if the current user is an admin
 */
async function checkAdminStatus(req, res) {
  try {
    // If the user is authenticated and has admin rights
    if (req.user && req.user.isAdmin) {
      return res.json({ isAdmin: true });
    }
    
    // If no admin privileges
    return res.json({ isAdmin: false });
  } catch (error) {
    console.error('[checkAdminStatus] Error:', error);
    return res.status(500).json({ error: 'Server error', isAdmin: false });
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    generateNewApiKey,
    toggleApiKeyStatus,
    getUserApiKeys,
    getAllUsers,
    deleteUser,
    deleteApiKey,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    changeEmail,
    verifyEmailChange,
    verifyPasswordChange,
    adminLogin,
    logout,
    checkSession,
    checkAdminStatus
}; 