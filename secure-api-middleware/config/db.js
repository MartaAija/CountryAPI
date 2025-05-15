/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 * It also initializes the database schema to match existing database structure.
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

// Initialize database with schema matching existing database structure
const initializeDatabase = async (retries = 10, delay = 5000) => {
  let connection;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await pool.getConnection();

      // Create countries table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS countries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL,
          code VARCHAR(3) COLLATE utf8mb4_general_ci NOT NULL,
          UNIQUE KEY unique_country_name (name),
          UNIQUE KEY unique_country_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(45) COLLATE utf8mb4_general_ci NOT NULL,
          password_hash VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
          first_name VARCHAR(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
          last_name VARCHAR(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
          email VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255) DEFAULT NULL,
          verification_expires DATETIME DEFAULT NULL,
          reset_token VARCHAR(255) DEFAULT NULL,
          reset_expires DATETIME DEFAULT NULL,
          password_reset_token VARCHAR(255) DEFAULT NULL,
          password_reset_expires DATETIME DEFAULT NULL,
          password_change_token VARCHAR(255) DEFAULT NULL,
          password_change_expires DATETIME DEFAULT NULL,
          email_change_token VARCHAR(255) DEFAULT NULL,
          email_change_expires DATETIME DEFAULT NULL,
          new_email VARCHAR(100) DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_username (username),
          UNIQUE KEY unique_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create api_keys table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          key_value VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
          key_type ENUM('primary', 'secondary') NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used DATETIME DEFAULT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_key_value (key_value),
          UNIQUE KEY unique_user_key_type (user_id, key_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create blog_posts table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          country_id INT NOT NULL,
          visit_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create comments table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          content TEXT NOT NULL,
          parent_id INT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create post_reactions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_reactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id INT NOT NULL,
          reaction_type ENUM('like', 'dislike') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_post (user_id, post_id),
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Create followers table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS followers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          follower_id INT NOT NULL,
          following_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_follow (follower_id, following_id),
          FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      connection.release();
      console.log('Database tables created successfully');
      return;

    } catch (error) {
      console.error('Error initializing database:', error);

      if (connection) {
        connection.release();
      }

      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Failed to initialize database after multiple attempts');
      }
    }
  }
};

// Start initialization immediately
initializeDatabase();

// Export the pool for use in other modules
module.exports = pool;

/*
 * Note on Database Normalization:
 * The users table contains authentication token fields that could be normalized into separate tables.
 * This denormalization is intentional for:
 * 1. Performance - avoiding joins on critical authentication flows
 * 2. Simplicity - keeping related security tokens with the user record
 * 3. Transactional integrity - ensuring atomic operations for security processes
 * 
 * These tokens are temporary by nature and are invalidated after use, making
 * this a common and practical approach for authentication systems.
 */
