/**
 * Admin Controller Module
 * Handles administrator-level operations for user and API key management
 */
const UserDAO = require('../models/UserDAO');
const BlogDAO = require('../models/BlogDAO');
const pool = require('../config/db');

/**
 * Get all users with their profile information and API keys
 */
async function getAllUsers(req, res) {
  try {
    // Fetch all users from the database with API key info
    const users = await UserDAO.getAllUsersWithApiKeys();
    
    // Return the users data
    res.json(users);
  } catch (error) {
    console.error('[getAllUsers] Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Delete a user
 */
async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    
    // Delete the user
    const success = await UserDAO.deleteUser(userId);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[deleteUser] Error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

/**
 * Toggle an API key's active status
 */
async function toggleApiKey(req, res) {
  try {
    const { userId, keyType } = req.params;
    const { is_active } = req.body;
    
    // Input validation
    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active status is required' });
    }
    
    // Determine which API key to toggle based on keyType
    const keyColumn = 'key_value';
    const isActiveColumn = 'is_active';
    
    // Update the key's active status
    const [result] = await pool.query(
      `UPDATE api_keys SET ${isActiveColumn} = ? 
       WHERE user_id = ? AND key_type = ?`,
      [is_active ? 1 : 0, userId, keyType]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User or API key not found' });
    }
    
    res.json({ 
      message: `${keyType} API key ${is_active ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('[toggleApiKey] Error:', error);
    res.status(500).json({ error: 'Failed to toggle API key status' });
  }
}

/**
 * Delete an API key
 */
async function deleteApiKey(req, res) {
  try {
    const { userId, keyType } = req.params;
    
    // Delete the API key
    const [result] = await pool.query(
      `DELETE FROM api_keys WHERE user_id = ? AND key_type = ?`,
      [userId, keyType]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User or API key not found' });
    }
    
    res.json({ message: `${keyType} API key deleted successfully` });
  } catch (error) {
    console.error('[deleteApiKey] Error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
}

/**
 * Get all blog posts for a specific user
 */
async function getUserBlogs(req, res) {
  try {
    const { userId } = req.params;
    
    // Query to get all blog posts for the specified user with country info
    const [posts] = await pool.query(`
      SELECT 
        bp.id, bp.title, bp.content, bp.visit_date, bp.created_at, 
        c.name AS country_name,
        (SELECT COUNT(*) FROM comments WHERE post_id = bp.id) as comments_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = bp.id AND reaction_type = 'like') as likes_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = bp.id AND reaction_type = 'dislike') as dislikes_count
      FROM blog_posts bp
      LEFT JOIN countries c ON bp.country_id = c.id
      WHERE bp.user_id = ?
      ORDER BY bp.created_at DESC
    `, [userId]);
    
    res.json({
      userId,
      blogCount: posts.length,
      posts
    });
  } catch (error) {
    console.error('[getUserBlogs] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user blogs' });
  }
}

/**
 * Delete a blog post (admin override, no need to check ownership)
 */
async function deleteBlog(req, res) {
  try {
    const { blogId } = req.params;
    
    // Delete related data
    // 1. Delete comments and replies
    await pool.query('DELETE FROM comments WHERE post_id = ?', [blogId]);
    
    // 2. Delete reactions
    await pool.query('DELETE FROM post_reactions WHERE post_id = ?', [blogId]);
    
    // 3. Delete the blog post
    const [result] = await pool.query('DELETE FROM blog_posts WHERE id = ?', [blogId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('[deleteBlog] Error:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
}

module.exports = {
  getAllUsers,
  deleteUser,
  toggleApiKey,
  deleteApiKey,
  getUserBlogs,
  deleteBlog
}; 