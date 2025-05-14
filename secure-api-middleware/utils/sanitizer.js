/**
 * Input Sanitization Utility
 * Provides functions to sanitize different types of user input
 * to protect against XSS, injection attacks and other security vulnerabilities
 */
const xss = require('xss');
const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} input - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  return xss(input.trim());
}

/**
 * Sanitize an email address
 * @param {string} email - The email to sanitize
 * @returns {string} - Sanitized email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return email;
  }
  // Only allow standard email characters and structure
  return email.trim().toLowerCase()
    .replace(/[^\w@.-]/g, '')
    .substring(0, 255);
}

/**
 * Sanitize a username
 * @param {string} username - The username to sanitize
 * @returns {string} - Sanitized username
 */
function sanitizeUsername(username) {
  if (typeof username !== 'string') {
    return username;
  }
  // Only allow alphanumeric characters, underscore, and hyphen
  return username.trim()
    .replace(/[^\w-]/g, '')
    .substring(0, 30);
}

/**
 * Sanitize HTML content allowing only whitelisted tags and attributes
 * @param {string} html - The HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
function sanitizeHtmlContent(html) {
  if (typeof html !== 'string') {
    return html;
  }
  return sanitizeHtml(html, {
    allowedTags: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
}

/**
 * Sanitize an object by recursively sanitizing its string properties
 * @param {object} object - The object to sanitize
 * @returns {object} - Sanitized object
 */
function sanitizeObject(object) {
  if (!object || typeof object !== 'object') {
    return object;
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? sanitizeString(item) 
          : typeof item === 'object' 
            ? sanitizeObject(item) 
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Middleware for sanitizing request body data
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Sanitize URL parameter by removing special characters
 * @param {string} param - URL parameter to sanitize
 * @returns {string} - Sanitized parameter
 */
function sanitizeUrlParam(param) {
  if (typeof param !== 'string') {
    return param;
  }
  // Only allow alphanumeric characters and limited special chars
  return param.replace(/[^\w-]/g, '');
}

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizeUsername,
  sanitizeHtmlContent,
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeUrlParam
}; 