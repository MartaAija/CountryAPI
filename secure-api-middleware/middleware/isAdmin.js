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
  
  // Check if user object exists and has admin flag
  if (!req.user) {
    return res.status(403).json({ error: "Access denied: Admin privileges required" });
  }
  // Check if user has admin privileges
  if (req.user.isAdmin === true) {
    return next();
  }
  return res.status(403).json({ error: "Access denied: Admin privileges required" });
}; 