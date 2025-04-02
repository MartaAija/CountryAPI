/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

// Detailed logging for debugging
console.log("=== DATABASE INITIALIZATION ===");
console.log("DATABASE_URL available:", !!process.env.DATABASE_URL);
console.log("PORT:", process.env.PORT);

// Create connection pool using DATABASE_URL only
let pool;

try {
  pool = mysql.createPool(process.env.DATABASE_URL);
  console.log("Pool created successfully");
} catch (error) {
  console.error("Error creating connection pool:", error);
  process.exit(1); // Exit if we can't even create the pool
}

// Initialize database with tables
async function initializeDatabase() {
  try {
    console.log("Testing database connection...");
    const [result] = await pool.query("SELECT 1 as test");
    console.log("Database connection successful:", result);

    // Create users table
    console.log("Creating users table if not exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
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
    console.log("Users table created/verified");

    // Create api_key_usage table
    console.log("Creating api_key_usage table if not exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_key_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("API key usage table created/verified");

    console.log("Database initialization complete!");
    
    // Verify tables exist by querying information_schema
    const [tables] = await pool.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'api_key_usage')
    `);
    console.log("Verified tables:", tables.map(t => t.TABLE_NAME));
    
  } catch (error) {
    console.error("DATABASE INITIALIZATION ERROR:");
    console.error(error.message);
    console.error(error.stack);
    // Don't exit - let the server try to start anyway
  }
}

// Run initialization immediately
initializeDatabase();

// Export pool for other modules to use
module.exports = pool; 