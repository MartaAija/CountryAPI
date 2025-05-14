/**
 * User Data Access Object
 * Handles all database operations related to users
 */
const BaseDAO = require('./BaseDAO');
const bcrypt = require('bcryptjs');
const { generateApiKey } = require('../utils/apiKeyGenerator');

class UserDAO extends BaseDAO {
  constructor() {
    super('users');
  }

  /**
   * Find a user by username
   * @param {string} username - The username to search for
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByUsername(username) {
    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM ${this.tableName} WHERE username = ?`,
        [username]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error in UserDAO.findByUsername:', error);
      throw error;
    }
  }

  /**
   * Get complete user data including API keys
   * @param {number} userId - The user ID
   * @returns {Promise<Object|null>} - Complete user data or null
   */
  async getUserWithProfileAndKeys(userId) {
    try {
      const [rows] = await this.pool.query(
        `SELECT 
          u.id, u.username, u.first_name, u.last_name, u.email, u.created_at,
          primary_key.key_value as api_key_primary, 
          primary_key.is_active as is_active_primary,
          primary_key.created_at as created_at_primary,
          primary_key.last_used as last_used_primary,
          secondary_key.key_value as api_key_secondary,
          secondary_key.is_active as is_active_secondary,
          secondary_key.created_at as created_at_secondary,
          secondary_key.last_used as last_used_secondary
        FROM users u
        LEFT JOIN api_keys primary_key ON u.id = primary_key.user_id AND primary_key.key_type = 'primary'
        LEFT JOIN api_keys secondary_key ON u.id = secondary_key.user_id AND secondary_key.key_type = 'secondary'
        WHERE u.id = ?`,
        [userId]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error in UserDAO.getUserWithProfileAndKeys:', error);
      throw error;
    }
  }

  /**
   * Get all users with their API key information
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of user objects
   */
  async getAllUsersWithProfileAndKeys(options = {}) {
    try {
      const { limit, offset } = options;
      let query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.created_at,
          primary_key.key_value as api_key_primary, 
          primary_key.is_active as is_active_primary,
          primary_key.created_at as created_at_primary,
          primary_key.last_used as last_used_primary,
          secondary_key.key_value as api_key_secondary,
          secondary_key.is_active as is_active_secondary,
          secondary_key.created_at as created_at_secondary,
          secondary_key.last_used as last_used_secondary
        FROM users u
        LEFT JOIN api_keys primary_key ON u.id = primary_key.user_id AND primary_key.key_type = 'primary'
        LEFT JOIN api_keys secondary_key ON u.id = secondary_key.user_id AND secondary_key.key_type = 'secondary'
        ORDER BY u.id
      `;
      
      if (limit) {
        query += ` LIMIT ?`;
        if (offset) {
          query += ` OFFSET ?`;
        }
      }
      
      const params = [];
      if (limit) params.push(parseInt(limit));
      if (offset) params.push(parseInt(offset));
      
      const [rows] = await this.pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error in UserDAO.getAllUsersWithProfileAndKeys:', error);
      throw error;
    }
  }

  /**
   * Register a new user with API key
   * @param {Object} userData - User data (username, password, first_name, last_name, email)
   * @returns {Promise<Object>} - Created user with API key
   */
  async registerUser(userData) {
    const { username, password, first_name, last_name, email } = userData;
    
    // Start a transaction
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user with profile information
      const [userResult] = await connection.query(
        'INSERT INTO users (username, password_hash, first_name, last_name, email) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, first_name, last_name, email]
      );
      
      const userId = userResult.insertId;
      
      // Generate API key
      const apiKey = generateApiKey();
      
      // Create primary API key
      await connection.query(
        'INSERT INTO api_keys (user_id, key_value, key_type, is_active) VALUES (?, ?, ?, ?)',
        [userId, apiKey, 'primary', true]
      );
      
      await connection.commit();
      connection.release();
      
      return {
        id: userId,
        username,
        first_name,
        last_name,
        email,
        apiKey
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error in UserDAO.registerUser:', error);
      throw error;
    }
  }

  /**
   * Verify API key and update last used timestamp
   * @param {string} apiKey - The API key to verify
   * @returns {Promise<Object|null>} - User ID if valid, null if not
   */
  async verifyApiKey(apiKey) {
    try {
      const [rows] = await this.pool.query(
        `SELECT user_id, key_type 
         FROM api_keys 
         WHERE key_value = ? AND is_active = true`,
        [apiKey]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const { user_id, key_type } = rows[0];
      
      // Update last used timestamp
      await this.pool.query(
        `UPDATE api_keys SET last_used = NOW() 
         WHERE user_id = ? AND key_type = ?`,
        [user_id, key_type]
      );
      
      return { userId: user_id, keyType: key_type };
    } catch (error) {
      console.error('Error in UserDAO.verifyApiKey:', error);
      throw error;
    }
  }

  /**
   * Generate a new API key for a user
   * @param {number} userId - The user ID
   * @param {string} keyType - The key type ('primary' or 'secondary')
   * @returns {Promise<string>} - The new API key
   */
  async generateNewApiKey(userId, keyType) {
    try {
      const apiKey = generateApiKey();
      
      // Check if key already exists
      const [existingKeys] = await this.pool.query(
        `SELECT id FROM api_keys WHERE user_id = ? AND key_type = ?`,
        [userId, keyType]
      );
      
      if (existingKeys.length > 0) {
        // Update existing key
        await this.pool.query(
          `UPDATE api_keys 
           SET key_value = ?, is_active = true, created_at = NOW(), last_used = NULL
           WHERE user_id = ? AND key_type = ?`,
          [apiKey, userId, keyType]
        );
      } else {
        // Create new key
        await this.pool.query(
          `INSERT INTO api_keys (user_id, key_value, key_type, is_active)
           VALUES (?, ?, ?, true)`,
          [userId, apiKey, keyType]
        );
      }
      
      // If generating primary key, deactivate secondary key and vice versa
      const otherKeyType = keyType === 'primary' ? 'secondary' : 'primary';
      await this.pool.query(
        `UPDATE api_keys SET is_active = false
         WHERE user_id = ? AND key_type = ?`,
        [userId, otherKeyType]
      );
      
      return apiKey;
    } catch (error) {
      console.error('Error in UserDAO.generateNewApiKey:', error);
      throw error;
    }
  }

  /**
   * Get API keys for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Object containing primary and secondary API keys
   */
  async getUserApiKeys(userId) {
    try {
      const [rows] = await this.pool.query(
        `SELECT key_type, key_value, is_active, created_at, last_used
         FROM api_keys
         WHERE user_id = ?`,
        [userId]
      );
      
      const apiKeys = {
        primary: null,
        secondary: null
      };
      
      rows.forEach(row => {
        if (row.key_type === 'primary') {
          apiKeys.primary = {
            key: row.key_value,
            is_active: row.is_active === 1,
            created_at: row.created_at,
            last_used: row.last_used
          };
        } else if (row.key_type === 'secondary') {
          apiKeys.secondary = {
            key: row.key_value,
            is_active: row.is_active === 1,
            created_at: row.created_at,
            last_used: row.last_used
          };
        }
      });
      
      return apiKeys;
    } catch (error) {
      console.error('Error in UserDAO.getUserApiKeys:', error);
      throw error;
    }
  }

  /**
   * Get all users with their API key information for admin panel
   * @returns {Promise<Array>} - Array of user objects with API keys
   */
  async getAllUsersWithApiKeys() {
    try {
      // Query to get all users with their API keys
      const query = `
        SELECT 
          u.id, u.username, u.first_name, u.last_name, u.email, u.created_at,
          primary_key.key_value as api_key_primary, 
          primary_key.is_active as is_active_primary,
          primary_key.created_at as created_at_primary,
          primary_key.last_used as last_used_primary,
          secondary_key.key_value as api_key_secondary,
          secondary_key.is_active as is_active_secondary,
          secondary_key.created_at as created_at_secondary,
          secondary_key.last_used as last_used_secondary
        FROM users u
        LEFT JOIN api_keys primary_key ON u.id = primary_key.user_id AND primary_key.key_type = 'primary'
        LEFT JOIN api_keys secondary_key ON u.id = secondary_key.user_id AND secondary_key.key_type = 'secondary'
        ORDER BY u.id
      `;
      
      const [rows] = await this.pool.query(query);
      return rows;
    } catch (error) {
      console.error('Error in UserDAO.getAllUsersWithApiKeys:', error);
      throw error;
    }
  }

  /**
   * Delete a user and all associated data
   * @param {number} userId - The user ID to delete
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteUser(userId) {
    // Start a transaction
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete API keys
      await connection.query('DELETE FROM api_keys WHERE user_id = ?', [userId]);
      
      // Delete user's blog post reactions
      await connection.query('DELETE FROM post_reactions WHERE user_id = ?', [userId]);
      
      // Delete user's comments
      await connection.query('DELETE FROM comments WHERE user_id = ?', [userId]);
      
      // Delete user's blog posts
      await connection.query('DELETE FROM blog_posts WHERE user_id = ?', [userId]);
      
      // Delete user's followers/following relationships
      await connection.query('DELETE FROM followers WHERE follower_id = ? OR following_id = ?', [userId, userId]);
      
      // Finally, delete the user
      const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]);
      
      await connection.commit();
      connection.release();
      
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error in UserDAO.deleteUser:', error);
      throw error;
    }
  }

  /**
   * Update the users table to include verification-related fields
   * This method should be called during database initialization
   * @returns {Promise<void>}
   */
  async updateSchema() {
    try {
      // Check if the 'is_verified' column exists
      const [columns] = await this.pool.query(`SHOW COLUMNS FROM ${this.tableName} LIKE 'is_verified'`);
      
      if (columns.length === 0) {
        // Add is_verified column
        await this.pool.query(`
          ALTER TABLE ${this.tableName}
          ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
          ADD COLUMN verification_token VARCHAR(255),
          ADD COLUMN verification_expires DATETIME,
          ADD COLUMN reset_token VARCHAR(255),
          ADD COLUMN reset_expires DATETIME,
          ADD COLUMN password_change_token VARCHAR(255),
          ADD COLUMN password_change_expires DATETIME,
          ADD COLUMN email_change_token VARCHAR(255),
          ADD COLUMN email_change_expires DATETIME,
          ADD COLUMN new_email VARCHAR(255)
        `);
        
      }
    } catch (error) {
      console.error('Error updating users table schema:', error);
      throw error;
    }
  }

  /**
   * Create verification token for a user
   * @param {number} userId - User ID
   * @param {string} token - Verification token
   * @param {number} expiresInHours - Token expiration time in hours
   * @returns {Promise<boolean>} - True if successful
   */
  async createVerificationToken(userId, token, expiresInHours = 24) {
    try {
      // Calculate expiration date
      const expires = new Date();
      expires.setHours(expires.getHours() + expiresInHours);
      
      // Update user with verification token
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET verification_token = ?, verification_expires = ? 
         WHERE id = ?`,
        [token, expires, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error creating verification token:', error);
      throw error;
    }
  }

  /**
   * Verify user's email with token
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @returns {Promise<boolean>} - True if verification successful
   */
  async verifyEmail(userId, token) {
    try {
      // Check if user exists with matching token that hasn't expired
      const [users] = await this.pool.query(
        `SELECT * FROM ${this.tableName} 
         WHERE id = ? AND verification_token = ? AND verification_expires > NOW()`,
        [userId, token]
      );
      
      if (users.length === 0) {
        return false;
      }
      
      // Mark user as verified and clear token
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET is_verified = TRUE, verification_token = NULL, verification_expires = NULL 
         WHERE id = ?`,
        [userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Check if a user's email is verified
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - True if verified
   */
  async isEmailVerified(userId) {
    try {
      const [users] = await this.pool.query(
        `SELECT is_verified FROM ${this.tableName} WHERE id = ?`,
        [userId]
      );
      
      return users.length > 0 && users[0].is_verified === 1;
    } catch (error) {
      console.error('Error checking email verification:', error);
      throw error;
    }
  }

  /**
   * Create password reset token for a user
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {number} expiresInHours - Token expiration time in hours
   * @returns {Promise<Object|null>} - User data or null if user not found
   */
  async createPasswordResetToken(email, token, expiresInHours = 1) {
    try {
      // Calculate expiration date
      const expires = new Date();
      expires.setHours(expires.getHours() + expiresInHours);
      
      // Find user by email
      const [users] = await this.pool.query(
        `SELECT id, username, email FROM ${this.tableName} WHERE email = ?`,
        [email]
      );
      
      if (users.length === 0) {
        return null;
      }
      
      // Update user with reset token
      await this.pool.query(
        `UPDATE ${this.tableName} 
         SET reset_token = ?, reset_expires = ? 
         WHERE id = ?`,
        [token, expires, users[0].id]
      );
      
      return users[0];
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw error;
    }
  }

  /**
   * Verify password reset token
   * @param {number} userId - User ID
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} - User data or null if token invalid
   */
  async verifyPasswordResetToken(userId, token) {
    try {
      // Check if user exists with matching token that hasn't expired
      const [users] = await this.pool.query(
        `SELECT id, username, email FROM ${this.tableName} 
         WHERE id = ? AND reset_token = ? AND reset_expires > NOW()`,
        [userId, token]
      );
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error verifying reset token:', error);
      throw error;
    }
  }

  /**
   * Reset user's password
   * @param {number} userId - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<boolean>} - True if successful
   */
  async resetPassword(userId, hashedPassword) {
    try {
      // Update password and clear reset token
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET password_hash = ?, reset_token = NULL, reset_expires = NULL 
         WHERE id = ?`,
        [hashedPassword, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  async findByEmail(email) {
    try {
      // Query database for user with the given email
      const [users] = await this.pool.query(
        `SELECT * FROM ${this.tableName} WHERE email = ?`,
        [email]
      );
      
      // Return first matching user or null
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Create password change token for a user
   * @param {number} userId - User ID
   * @param {string} token - Password change token
   * @param {number} expiresInHours - Token expiration time in hours
   * @returns {Promise<boolean>} - True if successful
   */
  async createPasswordChangeToken(userId, token, expiresInHours = 1) {
    try {
      // Calculate expiration date
      const expires = new Date();
      expires.setHours(expires.getHours() + expiresInHours);
      
      // Update user with password change token
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET password_change_token = ?, password_change_expires = ? 
         WHERE id = ?`,
        [token, expires, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error creating password change token:', error);
      throw error;
    }
  }

  /**
   * Create email change token for a user
   * @param {number} userId - User ID
   * @param {string} token - Email change token
   * @param {number} expiresInHours - Token expiration time in hours
   * @returns {Promise<boolean>} - True if successful
   */
  async createEmailChangeToken(userId, token, expiresInHours = 1) {
    try {
      // Calculate expiration date
      const expires = new Date();
      expires.setHours(expires.getHours() + expiresInHours);
      
      // Update user with email change token
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET email_change_token = ?, email_change_expires = ? 
         WHERE id = ?`,
        [token, expires, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error creating email change token:', error);
      throw error;
    }
  }

  /**
   * Update user's email
   * @param {number} userId - User ID
   * @param {string} newEmail - New email address
   * @returns {Promise<boolean>} - True if successful
   */
  async updateEmail(userId, newEmail) {
    try {
      // Update user's email and clear token fields
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} 
         SET email = ?, email_change_token = NULL, email_change_expires = NULL 
         WHERE id = ?`,
        [newEmail, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }
}

module.exports = new UserDAO(); 