/**
 * Security Logger Utility
 * Provides enhanced logging for security-related events
 */
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Security log file path
const securityLogPath = path.join(logsDir, 'security.log');

/**
 * Log a security event
 * @param {string} event - Type of security event
 * @param {Object} data - Data related to the event
 * @param {string} level - Log level (info, warn, error)
 */
function logSecurityEvent(event, data, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    event,
    ...data
  };
  
  // Sanitize sensitive data
  if (logEntry.password) logEntry.password = '[REDACTED]';
  if (logEntry.token) logEntry.token = '[REDACTED]';
  
  // Log to console
  console[level](`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(logEntry));
  
  // Log to file
  fs.appendFile(
    securityLogPath, 
    `${JSON.stringify(logEntry)}\n`,
    (err) => {
      if (err) console.error('Error writing to security log:', err);
    }
  );
}

/**
 * Log an authentication event
 * @param {string} type - Type of authentication event
 * @param {Object} data - Authentication data
 */
function logAuthEvent(type, data) {
  const sanitizedData = { ...data };
  
  // Remove sensitive fields
  delete sanitizedData.password;
  delete sanitizedData.token;
  
  logSecurityEvent(`auth:${type}`, sanitizedData);
}

/**
 * Log an authorization event
 * @param {string} type - Type of authorization event
 * @param {Object} data - Authorization data
 */
function logAuthorizationEvent(type, data) {
  logSecurityEvent(`authorization:${type}`, data);
}

/**
 * Log an access event
 * @param {string} type - Type of access event
 * @param {Object} data - Access data
 */
function logAccessEvent(type, data) {
  logSecurityEvent(`access:${type}`, data);
}

/**
 * Log a security violation
 * @param {string} type - Type of security violation
 * @param {Object} data - Violation data
 */
function logSecurityViolation(type, data) {
  logSecurityEvent(`violation:${type}`, data, 'error');
}

module.exports = {
  logAuthEvent,
  logAuthorizationEvent,
  logAccessEvent,
  logSecurityViolation
}; 