/**
 * Authentication Routes Module
 * Routes for user authentication, profile management, and API key operations.
 */
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");

// Public routes (no authentication required)
router.post("/signup", authController.registerUser);      // Register new account
router.post("/login", authController.loginUser);          // Authenticate user

// Protected routes (require valid JWT)
router.get("/profile", authenticate, authController.getUserProfile);           // Get user profile
router.post("/update-profile", authenticate, authController.updateUserProfile); // Update profile info
router.post("/change-password", authenticate, authController.changePassword);   // Change password
router.post("/generate-api-key", authenticate, authController.generateNewApiKey); // Create new API key
router.post("/toggle-api-key/:userId", authenticate, authController.toggleApiKey); // Enable/disable key
router.delete("/delete-api-key/:userId", authenticate, authController.deleteApiKey); // Remove API key
router.delete("/delete-account", authenticate, authController.deleteAccount);   // Delete user account
router.get("/api-keys", authenticate, authController.getUserApiKeys);          // Get user's API keys

// Admin routes 
router.get("/users", authController.getAllUsers);         // Get all users (admin only)
router.post("/admin/toggle-api-key/:userId", authController.adminToggleApiKey); // Toggle any user's key
router.delete("/admin/delete-api-key/:userId", authController.adminDeleteApiKey); // Delete any user's key
router.delete("/admin/delete-user/:userId", authController.adminDeleteUser);    // Delete any user

module.exports = router; 