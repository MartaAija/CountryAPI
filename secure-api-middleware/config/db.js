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

// Function to test connection and initialize database if needed
async function initializeDatabase() {
    try {
        // Test connection
        await pool.query('SELECT 1');
        console.log('Database connection successful');
        
        // Check if users table exists
        const [tables] = await pool.query(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
        `, [process.env.DB_NAME]);
        
        // If users table doesn't exist, create necessary tables
        if (tables.length === 0) {
            console.log('Initializing database schema...');
            
            // Create users table
            await pool.query(`
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    api_key_primary VARCHAR(255),
                    api_key_secondary VARCHAR(255),
                    is_active_primary BOOLEAN DEFAULT false,
                    is_active_secondary BOOLEAN DEFAULT false,
                    created_at_primary DATETIME,
                    created_at_secondary DATETIME,
                    last_used_primary DATETIME,
                    last_used_secondary DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create any other necessary tables
            // Add more CREATE TABLE statements here...
            
            console.log('Database schema initialized successfully');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Initialize database on startup
initializeDatabase();

// Export the pool for use in other modules
module.exports = pool; 