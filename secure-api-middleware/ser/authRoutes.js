const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db"); // MySQL connection pool
require("dotenv").config();

const router = express.Router();

// Middleware to protect routes
const authenticate = require('./middleware');

// Track API key regeneration timestamps per user and key type
const lastKeyRegeneration = {};

// Generate API Key Function
const generateApiKey = () => {
    return [...Array(30)].map(() => Math.random().toString(36)[2]).join("");
};

// User Signup
router.post("/signup", async (req, res) => {
    try {
        console.log("Raw request body:", req.body);
        
        const { username, password, first_name, last_name } = req.body;
        
        // Validate required fields
        if (!username || !password || !first_name || !last_name) {
            console.log("Missing required fields:", {
                hasUsername: !!username,
                hasPassword: !!password,
                hasFirstName: !!first_name,
                hasLastName: !!last_name
            });
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if username already exists
        const [existingUser] = await db.query(
            "SELECT username FROM users WHERE username = ?", 
            [username]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ 
                error: "Username already exists. Please choose a different username." 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const apiKey = generateApiKey();

        // Insert user with primary API key
        const sql = `
            INSERT INTO users (
                username, password_hash, first_name, last_name,
                api_key_primary, is_active_primary, created_at_primary
            ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `;
        
        const values = [username, hashedPassword, first_name, last_name, apiKey];
        console.log("SQL Query:", sql);
        console.log("Values being inserted:", {
            username,
            first_name,
            last_name,
            apiKeyLength: apiKey.length
        });

        const [result] = await db.query(sql, values);
        console.log("Database insert result:", result);

        res.status(201).json({ 
            message: "User registered successfully!", 
            apiKey 
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Database error: " + err.message });
    }
});

// User Login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ message: "Login successful!", token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get Profile (API Key Management)
router.get("/profile", authenticate, async (req, res) => {
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

        console.log("Profile data being sent:", rows[0]);
        res.json(rows[0]);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Update User Details
router.post('/update-profile', authenticate, async (req, res) => {
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
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
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
        console.error("Password change error:", err);
        res.status(500).json({ error: "Failed to change password" });
    }
});

// Generate new API Key
router.post('/generate-api-key', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { keyType } = req.body; // 'primary' or 'secondary'
        
        // Cooldown check (5 minutes)
        const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
        const userKeyId = `${userId}_${keyType}`;
        const now = Date.now();
        
        if (lastKeyRegeneration[userKeyId] && (now - lastKeyRegeneration[userKeyId]) < cooldownPeriod) {
            const timeRemaining = Math.ceil((lastKeyRegeneration[userKeyId] + cooldownPeriod - now) / 1000);
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            
            // Format the time remaining in a more user-friendly way
            let waitMessage = "";
            if (minutes > 0) {
                waitMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
                if (seconds > 0) {
                    waitMessage += ` and ${seconds} second${seconds > 1 ? 's' : ''}`;
                }
            } else {
                waitMessage = `${seconds} second${seconds > 1 ? 's' : ''}`;
            }
            
            return res.status(429).json({ 
                error: `Please wait ${waitMessage} before generating a new ${keyType} API key`
            });
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
        
        // Update the timestamp for this user and key type
        lastKeyRegeneration[userKeyId] = now;

        res.json({ 
            message: `New ${keyType} API Key generated successfully`,
            apiKey: apiKey
        });
    } catch (err) {
        console.error("Generate API key error:", err);
        res.status(500).json({ error: "Failed to generate API key" });
    }
});

// Toggle API Key status
router.post('/toggle-api-key/:userId', authenticate, async (req, res) => {
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
        console.error("Toggle API key error:", err);
        res.status(500).json({ error: "Failed to toggle API key status" });
    }
});

// Delete API Key
router.delete('/delete-api-key/:userId', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { keyType } = req.body; // 'primary' or 'secondary'

        if (!keyType) {
            return res.status(400).json({ error: "Key type is required" });
        }

        const updateFields = keyType === 'primary' ? 
            'api_key_primary = NULL, is_active_primary = 0, created_at_primary = NULL, last_used_primary = NULL' :
            'api_key_secondary = NULL, is_active_secondary = 0, created_at_secondary = NULL, last_used_secondary = NULL';

        await db.query(
            `UPDATE users SET ${updateFields} WHERE id = ?`, 
            [userId]
        );

        res.json({ message: `${keyType} API key deleted successfully` });
    } catch (err) {
        console.error('Delete API key error:', err);
        res.status(500).json({ error: "Failed to delete API key" });
    }
});

// Delete Account
router.delete('/delete-account', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete user
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        
        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: "Failed to delete account" });
    }
});

// Get user's API keys
router.get('/api-keys', authenticate, async (req, res) => {
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
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: "Failed to fetch API keys" });
    }
});

// Get users route for admin
router.get("/users", async (req, res) => {
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
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Toggle API Key status (Admin)
router.post('/admin/toggle-api-key/:userId', async (req, res) => {
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
        console.error("Toggle API key error:", error);
        res.status(500).json({ error: "Failed to toggle API key status" });
    }
});

// Delete API Key (Admin)
router.delete('/admin/delete-api-key/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { keyType } = req.body;
        
        const updateFields = keyType === 'secondary' ?
            'api_key_secondary = NULL, is_active_secondary = 0, created_at_secondary = NULL, last_used_secondary = NULL' :
            'api_key_primary = NULL, is_active_primary = 0, created_at_primary = NULL, last_used_primary = NULL';
        
        await db.query(
            `UPDATE users SET ${updateFields} WHERE id = ?`,
            [userId]
        );

        res.json({ message: "API key deleted successfully" });
    } catch (error) {
        console.error("Delete API key error:", error);
        res.status(500).json({ error: "Failed to delete API key" });
    }
});

// Delete User (Admin)
router.delete('/admin/delete-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

module.exports = router;
