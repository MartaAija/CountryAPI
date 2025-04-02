/**
 * Database Configuration Module
 * This module establishes a connection to the MySQL database using connection pooling.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

// Extensive logging for debugging
console.log('===========================================');
console.log('DATABASE CONNECTION SETUP STARTING');
console.log('Environment variables check:');
console.log('- DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('- DB_HOST present:', !!process.env.DB_HOST);
console.log('- PORT:', process.env.PORT);
console.log('===========================================');

// Create connection pool
let pool;
try {
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    pool = mysql.createPool(process.env.DATABASE_URL);
  } else {
    console.log('Using individual connection parameters');
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  console.log('Connection pool created successfully');
} catch (error) {
  console.error('CRITICAL ERROR: Failed to create connection pool:', error);
  process.exit(1); // Exit if we can't even create the pool
}

// Sleep function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to initialize database with retries
async function initializeDatabase(retries = 10, delay = 5000) {
  let connection;
  try {
    console.log(`\nDatabase initialization attempt ${11-retries}/10`);
    
    // Test connection first
    console.log('Getting connection from pool...');
    connection = await pool.getConnection();
    console.log('✅ Successfully connected to database!');
    
    // Verify we can run queries
    console.log('Testing query execution...');
    const [testResult] = await connection.query('SELECT 1 as test');
    console.log('✅ Query test successful:', testResult);
    
    // Check if users table exists
    console.log('Checking if users table exists...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    
    if (tables.length === 0) {
      console.log('Users table does not exist. Creating it now...');
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
      console.log('✅ Users table created successfully!');
    } else {
      console.log('✅ Users table already exists.');
    }
    
    // Check if api_key_usage table exists
    console.log('Checking if api_key_usage table exists...');
    const [apiKeyTables] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_key_usage'
    `);
    
    if (apiKeyTables.length === 0) {
      console.log('api_key_usage table does not exist. Creating it now...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS api_key_usage (
          id INT AUTO_INCREMENT PRIMARY KEY,
          api_key VARCHAR(255) NOT NULL,
          endpoint VARCHAR(255) NOT NULL,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ api_key_usage table created successfully!');
    } else {
      console.log('✅ api_key_usage table already exists.');
    }
    
    // List all tables for verification
    console.log('Getting a list of all tables...');
    const [allTables] = await connection.query(`SHOW TABLES`);
    console.log('✅ Tables in database:', allTables.map(row => Object.values(row)[0]));
    
    console.log('DATABASE INITIALIZATION COMPLETED SUCCESSFULLY');
    
    return true;
  } catch (error) {
    console.error('❌ DATABASE INITIALIZATION ERROR:', error.message);
    
    if (retries > 0) {
      console.log(`Will retry in ${delay/1000} seconds... (${retries-1} retries remaining)`);
      await sleep(delay);
      return initializeDatabase(retries - 1, delay);
    } else {
      console.error('❌ ALL RETRIES FAILED. Database initialization unsuccessful.');
      return false;
    }
  } finally {
    if (connection) {
      console.log('Releasing database connection');
      connection.release();
    }
  }
}

// Initialize database immediately
(async () => {
  console.log('Starting database initialization...');
  const success = await initializeDatabase();
  if (success) {
    console.log('Database is ready for use!');
  } else {
    console.error('WARNING: Database initialization failed after all retries.');
    console.log('The application will continue, but database operations may fail.');
  }
})();

module.exports = pool; 