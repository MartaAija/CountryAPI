/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

console.log("Starting database connection setup");

// Simple connection parameters - use DATABASE_URL directly
const connectionUrl = process.env.DATABASE_URL;
console.log("Connection URL available:", !!connectionUrl);

// Create connection pool
const pool = mysql.createPool(connectionUrl);

// Function to initialize database tables
async function initializeDatabase() {
  let connection;
  try {
    console.log("Getting connection from pool...");
    connection = await pool.getConnection();
    console.log("Connection successful!");

    // Create users table
    console.log("Creating users table...");
    await connection.query(`
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
    console.log("Users table created successfully");

    // Create api_key_usage table
    console.log("Creating api_key_usage table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_key_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("API key usage table created successfully");

    // List all tables for verification
    const [rows] = await connection.query(`
      SHOW TABLES
    `);
    console.log("Current tables in database:", rows.map(row => Object.values(row)[0]));

  } catch (error) {
    console.error("Database initialization error:", error.message);
    console.error("Error stack:", error.stack);
  } finally {
    if (connection) {
      console.log("Releasing database connection");
      connection.release();
    }
  }
}

// Initialize database on startup
console.log("Initializing database...");
initializeDatabase().then(() => {
  console.log("Database initialization complete");
}).catch(err => {
  console.error("Fatal database initialization error:", err);
});

module.exports = pool; 