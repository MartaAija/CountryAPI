/**
 * Admin Authorization Middleware
 * This middleware validates if the authenticated user has admin privileges
 */
require("dotenv").config();

/**
 * Middleware function to verify admin status
 * Checks if the authenticated user has admin privileges
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = (req, res, next) => {
  console.log('Admin authorization middleware called');
  
  // Check if user object exists and has admin flag
  if (!req.user) {
    console.log('Admin authorization failed: No user object');
    return res.status(403).json({ error: "Access denied: Admin privileges required" });
  }
  
  console.log('User in request:', req.user);
  console.log('Is admin flag:', req.user.isAdmin);
  
  // Check if user has admin privileges
  if (req.user.isAdmin === true) {
    console.log('Admin authorization successful');
    return next();
  }
  
  console.log('Admin authorization failed: User is not an admin');
  return res.status(403).json({ error: "Access denied: Admin privileges required" });
}; 