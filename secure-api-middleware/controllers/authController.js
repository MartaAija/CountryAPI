/**
 * Authentication Controller Module
 * Handles all authentication-related business logic including:
 * - User registration and login
 * - Profile management
 * - API key generation and management
 * - Admin user management
 */

const bcrypt = require("bcryptjs");      // Library for password hashing
const jwt = require("jsonwebtoken");      // JWT for stateless authentication
const db = require("../config/db");       // Database connection pool
const { generateApiKey, checkCooldown, updateCooldown } = require("../utils/apiKeyGenerator"); // API key utilities

/**
 * User Registration Handler
 * Creates a new user account with:
 * - Hashed password for security
 * - Initial primary API key generation
 * - Basic profile information storage
 */
async function registerUser(req, res) {
    try {
        
        const { username, password, first_name, last_name } = req.body;
        
        // Input validation - ensure all required fields are provided
        if (!username || !password || !first_name || !last_name) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check for duplicate usernames to prevent conflicts
        const [existingUser] = await db.query(
            "SELECT username FROM users WHERE username = ?", 
            [username]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ 
                error: "Username already exists. Please choose a different username." 
            });
        }

        // Security: Hash password with bcrypt before storing
        // The salt (10 rounds) is automatically generated and stored with the hash
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate initial API key for the user
        const apiKey = generateApiKey();

        // Insert new user with primary API key
        // Note: Using parameterized query for SQL injection prevention
        const sql = `
            INSERT INTO users (
                username, password_hash, first_name, last_name,
                api_key_primary, is_active_primary, created_at_primary
            ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `;
        
        const values = [username, hashedPassword, first_name, last_name, apiKey];

        // Execute the insert operation
        const [result] = await db.query(sql, values);

        // Return success response with the generated API key
        res.status(201).json({ 
            message: "User registered successfully!", 
            apiKey 
        });
    } catch (err) {
        // Error handling with specific error message
        res.status(500).json({ error: "Database error: " + err.message });
    }
}

/**
 * User Login Handler
 * Authenticates a user and provides a JWT token for subsequent requests
 */
async function loginUser(req, res) {
    try {
        const { username, password } = req.body;
        
        // Find user by username
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

        // User not found
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = rows[0];
        
        // Verify password using bcrypt compare
        // This checks if the provided password matches the stored hash
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create JWT token with user information
        // This token will be used for authentication in subsequent requests
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET,
            { expiresIn: "1h" } // Token expires in 1 hour for security
        );

        // Return success with token
        res.json({ message: "Login successful!", token });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
}

// Get User Profile
async function getUserProfile(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT id, username, first_name, last_name,
                    api_key_primary, is_active_primary, 
                    DATE_FORMAT(created_at_primary, '%Y-%m-%d %H:%i:%s') AS created_at_primary, 
                    DATE_FORMAT(last_used_primary, '%Y-%m-%d %H:%i:%s') AS last_used_primary,
                    api_key_secondary, is_active_secondary, 
                    DATE_FORMAT(created_at_secondary, '%Y-%m-%d %H:%i:%s') AS created_at_secondary, 
                    DATE_FORMAT(last_used_secondary, '%Y-%m-%d %H:%i:%s') AS last_used_secondary
             FROM users WHERE id = ?`, 
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
}

// Update User Profile
async function updateUserProfile(req, res) {
    try {
        const { first_name, last_name } = req.body;
        const userId = req.user.id;

        if (!first_name || !last_name) {
            return res.status(400).json({ error: "First name and last name are required" });
        }

        await db.query(
            "UPDATE users SET first_name = ?, last_name = ? WHERE id = ?",
            [first_name, last_name, userId]
        );

        const [updated] = await db.query(
            "SELECT first_name, last_name FROM users WHERE id = ?",
            [userId]
        );

        res.json({ 
            message: "Profile updated successfully",
            user: updated[0]
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
}

// Change Password
async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get user's current password hash
        const [user] = await db.query(
            "SELECT password_hash FROM users WHERE id = ?", 
            [userId]
        );

        if (!user.length) {
            return res.status(404).json({ error: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user[0].password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.query(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [newPasswordHash, userId]
        );

        res.json({ message: "Password changed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to change password" });
    }
}

// Generate new API Key
async function generateNewApiKey(req, res) {
    try {
        const userId = req.user.id;
        const { keyType } = req.body; // 'primary' or 'secondary'
        
        // Check cooldown period
        const cooldown = checkCooldown(userId, keyType);
        if (cooldown.onCooldown) {
            return res.status(429).json({ error: cooldown.message });
        }
        
        const apiKey = generateApiKey();

        const statusField = keyType === 'secondary' ? 'is_active_secondary' : 'is_active_primary';
        const otherStatusField = keyType === 'secondary' ? 'is_active_primary' : 'is_active_secondary';

        // Generate new key and deactivate the other one
        await db.query(
            `UPDATE users 
             SET ${keyType === 'secondary' ? 'api_key_secondary' : 'api_key_primary'} = ?,
                 ${statusField} = 1,
                 ${keyType === 'secondary' ? 'created_at_secondary' : 'created_at_primary'} = NOW(),
                 ${otherStatusField} = 0
             WHERE id = ?`,
            [apiKey, userId]
        );
        
        // Update the cooldown timestamp
        updateCooldown(userId, keyType);

        res.json({ 
            message: `New ${keyType} API Key generated successfully`,
            apiKey: apiKey
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate API key" });
    }
}

// Toggle API Key status
async function toggleApiKey(req, res) {
    try {
        const userId = req.user.id;
        const { keyType } = req.body; // 'primary' or 'secondary'
        
        // Get current user data
        const [user] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const currentUser = user[0];
        const keyField = keyType === 'secondary' ? 'api_key_secondary' : 'api_key_primary';
        const statusField = keyType === 'secondary' ? 'is_active_secondary' : 'is_active_primary';
        const otherStatusField = keyType === 'secondary' ? 'is_active_primary' : 'is_active_secondary';

        if (!currentUser[keyField]) {
            return res.status(400).json({ error: `No ${keyType} API key found` });
        }

        // Toggle the status
        const newStatus = currentUser[statusField] === 1 ? 0 : 1;
        
        if (newStatus === 1) {
            // If activating this key, deactivate the other one
            await db.query(
                `UPDATE users 
                 SET ${statusField} = 1, 
                     ${otherStatusField} = 0 
                 WHERE id = ?`,
                [userId]
            );
        } else {
            // If deactivating, just update this key's status
            await db.query(
                `UPDATE users SET ${statusField} = 0 WHERE id = ?`,
                [userId]
            );
        }

        // Fetch updated user data
        const [updatedUser] = await db.query(
            `SELECT id, username, first_name, last_name,
                    api_key_primary, is_active_primary, created_at_primary, last_used_primary,
                    api_key_secondary, is_active_secondary, created_at_secondary, last_used_secondary
             FROM users WHERE id = ?`,
            [userId]
        );

        res.json({ 
            message: `${keyType} API key ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
            user: updatedUser[0]
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle API key status" });
    }
}

// Delete API Key
async function deleteApiKey(req, res) {
    try {
        const userId = req.user.id;
        // Check for keyType in both query params and request body
        const keyType = req.query.keyType || (req.body ? req.body.keyType : null);

        if (!keyType) {
            return res.status(400).json({ error: "Key type is required" });
        }

        // Verify the user exists
        const [userCheck] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Set the fields to update based on key type, but keep created_at with a default timestamp
        const updateFields = keyType === 'primary' ? 
            'api_key_primary = NULL, is_active_primary = 0, last_used_primary = NULL' :
            'api_key_secondary = NULL, is_active_secondary = 0, last_used_secondary = NULL';

        // Execute the update
        const [result] = await db.query(
            `UPDATE users SET ${updateFields} WHERE id = ?`, 
            [userId]
        );

        // Check if the update affected any rows
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Failed to update API key - user not found" });
        }

        res.json({ message: `${keyType} API key deleted successfully`, success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete API key: " + err.message });
    }
}

// Delete Account
async function deleteAccount(req, res) {
    try {
        const userId = req.user.id;

        // Delete user
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        
        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete account" });
    }
}

// Get user's API keys
async function getUserApiKeys(req, res) {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(
            `SELECT id, 
                api_key_primary, is_active_primary, created_at_primary, last_used_primary,
                api_key_secondary, is_active_secondary, created_at_secondary, last_used_secondary
            FROM users 
            WHERE id = ?`,
            [userId]
        );
        
        // Format the response
        const apiKeys = {
            primary: rows[0]?.api_key_primary ? {
                key: rows[0].api_key_primary,
                is_active: rows[0].is_active_primary === 1,
                created_at: rows[0].created_at_primary,
                last_used: rows[0].last_used_primary
            } : null,
            secondary: rows[0]?.api_key_secondary ? {
                key: rows[0].api_key_secondary,
                is_active: rows[0].is_active_secondary === 1,
                created_at: rows[0].created_at_secondary,
                last_used: rows[0].last_used_secondary
            } : null
        };
        
        res.json(apiKeys);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch API keys" });
    }
}

// Admin: Get All Users
async function getAllUsers(req, res) {
    try {
        const [users] = await db.query(`
            SELECT id, username, first_name, last_name,
                api_key_primary, is_active_primary, 
                DATE_FORMAT(created_at_primary, '%Y-%m-%d %H:%i:%s') AS created_at_primary, 
                DATE_FORMAT(last_used_primary, '%Y-%m-%d %H:%i:%s') AS last_used_primary,
                api_key_secondary, is_active_secondary, 
                DATE_FORMAT(created_at_secondary, '%Y-%m-%d %H:%i:%s') AS created_at_secondary, 
                DATE_FORMAT(last_used_secondary, '%Y-%m-%d %H:%i:%s') AS last_used_secondary
            FROM users
        `);

        // Format the response for each user
        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            api_key_primary: user.api_key_primary || 'No API Key',
            is_active_primary: user.is_active_primary === 1,
            created_at_primary: user.created_at_primary,
            last_used_primary: user.last_used_primary,
            api_key_secondary: user.api_key_secondary || 'No API Key',
            is_active_secondary: user.is_active_secondary === 1,
            created_at_secondary: user.created_at_secondary,
            last_used_secondary: user.last_used_secondary
        }));

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
}

// Admin: Toggle API Key
async function adminToggleApiKey(req, res) {
    try {
        const { userId } = req.params;
        const { keyType, is_active } = req.body;
        
        const statusField = keyType === 'secondary' ? 'is_active_secondary' : 'is_active_primary';
        const otherStatusField = keyType === 'secondary' ? 'is_active_primary' : 'is_active_secondary';
        
        // If activating one key, deactivate the other
        if (is_active) {
            await db.query(
                `UPDATE users 
                 SET ${statusField} = 1, 
                     ${otherStatusField} = 0 
                 WHERE id = ?`,
                [userId]
            );
        } else {
            // If deactivating, just update the specified key
            await db.query(
                `UPDATE users SET ${statusField} = 0 WHERE id = ?`,
                [userId]
            );
        }

        res.json({ message: "API key status updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle API key status" });
    }
}

// Admin: Delete API Key
async function adminDeleteApiKey(req, res) {
    try {
        const { userId } = req.params;
        // Check for keyType in both query params and request body
        const keyType = req.query.keyType || (req.body ? req.body.keyType : null);
        
        if (!keyType) {
            return res.status(400).json({ error: "Key type is required" });
        }
        
        // Verify the user exists
        const [userCheck] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Set the fields to update based on key type, but keep created_at with a default timestamp
        const updateFields = keyType === 'primary' ?
            'api_key_primary = NULL, is_active_primary = 0, last_used_primary = NULL' :
            'api_key_secondary = NULL, is_active_secondary = 0, last_used_secondary = NULL';
        
        // Execute the update
        const [result] = await db.query(
            `UPDATE users SET ${updateFields} WHERE id = ?`,
            [userId]
        );
        
        // Check if the update affected any rows
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Failed to update API key - user not found" });
        }

        res.json({ message: "API key deleted successfully", success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete API key: " + error.message });
    }
}

// Admin: Delete User
async function adminDeleteUser(req, res) {
    try {
        const { userId } = req.params;
        
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user" });
    }
}

// Forgot Password
async function forgotPassword(req, res) {
    try {
        const { username, newPassword } = req.body;
        
        if (!username || !newPassword) {
            return res.status(400).json({ error: "Username and new password are required" });
        }
        
        // Find user by username
        const [user] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        
        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the password
        await db.query(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [hashedPassword, user[0].id]
        );
        
        res.json({ message: "Password reset successfully. Please login with your new password." });
    } catch (err) {
        res.status(500).json({ error: "Failed to reset password" });
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    generateNewApiKey,
    toggleApiKey,
    deleteApiKey,
    deleteAccount,
    getUserApiKeys,
    getAllUsers,
    adminToggleApiKey,
    adminDeleteApiKey,
    adminDeleteUser,
    forgotPassword
}; 