/**
 * Admin Routes Module
 * Defines all administrator-level API routes
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

// Simple route to check admin authentication status
router.get('/check-auth', authenticate, isAdmin, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      username: req.user.username,
      isAdmin: req.user.isAdmin
    }
  });
});

// Apply authentication middleware to all admin routes
router.use(authenticate);
// Apply admin authorization middleware to all admin routes
router.use(isAdmin);

// Admin User Management Routes
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);

// Admin API Key Management Routes
router.put('/users/:userId/api-keys/:keyType/toggle', adminController.toggleApiKey);
router.delete('/users/:userId/api-keys/:keyType', adminController.deleteApiKey);

// Admin Blog Management Routes
router.get('/users/:userId/blogs', adminController.getUserBlogs);
router.delete('/blogs/:blogId', adminController.deleteBlog);

module.exports = router; 