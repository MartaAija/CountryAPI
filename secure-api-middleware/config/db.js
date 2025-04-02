/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");  // Using promise-based MySQL driver for async/await support
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); // Load environment variables from .env file

// Debugging - log DB connection info (remove in production)
console.log('Attempting database connection with:', {
    directParams: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        hasPassword: !!process.env.DB_PASSWORD
    },
    hasConnectionUrl: !!process.env.DATABASE_URL
});

// Create connection pool - prioritize connection URL if available
const pool = process.env.DATABASE_URL 
    ? mysql.createPool(process.env.DATABASE_URL)  // Use connection URL if available
    : mysql.createPool({                         // Fall back to individual params
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
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
            
            console.log('Database schema initialized successfully');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Initialize database on startup
initializeDatabase();

// Debugging - log DB connection info (remove in production)
console.log('DB Connection Details: ', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    // Don't log password for security reasons
    hasPassword: !!process.env.DB_PASSWORD
});

// Export the pool for use in other modules
module.exports = pool; 