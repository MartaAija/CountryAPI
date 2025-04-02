/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();


// Create connection pool using environment variables
const pool = process.env.DATABASE_URL 
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'country_api_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

// Initialize database with correct schema
const initializeDatabase = async (retries = 10, delay = 5000) => {
  let connection;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await pool.getConnection();
    
      // Create users table with the exact schema needed
      await connection.query(`
        CREATE TABLE users (
          id int(11) NOT NULL AUTO_INCREMENT,
          first_name varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
          last_name varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
          username varchar(45) COLLATE utf8mb4_general_ci NOT NULL,
          password_hash varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
          api_key_primary varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
          created_at_primary timestamp NOT NULL DEFAULT current_timestamp(),
          is_active_primary tinyint(1) DEFAULT 0,
          last_used_primary datetime DEFAULT NULL,
          api_key_secondary varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
          is_active_secondary tinyint(1) DEFAULT 0,
          created_at_secondary timestamp NOT NULL DEFAULT current_timestamp(),
          last_used_secondary datetime DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      
      
      // Show existing tables
      const [tables] = await connection.query("SHOW TABLES");
      
      connection.release();
      return;
      
    } catch (error) {
      
      if (connection) {
        connection.release();
      }
      
      if (attempt < retries) {
        console.log(`Will retry in ${delay/1000} seconds... (${retries - attempt} retries remaining)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`Failed to initialize database after ${retries} attempts.`);
        // Don't throw error - let app start anyway but it will likely fail on DB operations
      }
    }
  }
};

// Start initialization immediately
initializeDatabase();

// Export the pool for use in other modules
module.exports = pool; 