/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");  // Using promise-based MySQL driver for async/await support
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); // Load environment variables from .env file

/**
 * Database connection pool configuration
 * Manages connections to MySQL database efficiently
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,        // Database server location (from .env)
    user: process.env.DB_USER,        // Database username (from .env)
    password: process.env.DB_PASSWORD, // Database password (from .env)
    database: process.env.DB_NAME,     // Database name (from .env)
    waitForConnections: true,         // Wait for connection if all are busy
    connectionLimit: 10,              // Maximum number of connections in pool
    queueLimit: 0                     // Unlimited queue size (0 = no limit)
});

/**
 * Test database connection on application startup
 * Exits process if connection fails
 */
async function testConn() {
    try {
        // Get a connection from the pool
        const testConnection = await pool.getConnection();
        // Remove detailed logging of success
        testConnection.release();
        // Connection successful
    } catch (err) {
        // Connection failed - exit application
        process.exit(1);
    }
}

// Test database connection on startup
testConn();

// Export the pool for use in other modules
module.exports = pool; 