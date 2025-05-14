/**
 * Blog Controller Module
 * Handles all blog-related operations: posts, comments, likes, following
 */
const BlogDAO = require('../models/BlogDAO');
const UserDAO = require('../models/UserDAO');
const pool = require('../config/db');
const { sanitizeString, sanitizeHtmlContent, sanitizeUrlParam } = require('../utils/sanitizer');

/**
 * Check if a table exists directly in the controller
 * @param {string} tableName - The name of the table to check
 * @returns {Promise<boolean>} - True if the table exists
 */
async function checkTableExists(tableName) {
  try {
    const [result] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `, [tableName]);
    
    return result[0].count > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * getPosts
 * Retrieves blog posts with pagination, optional filtering by user or country
 */
async function getPosts(req, res) {
  try {
    // Sanitize query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId ? sanitizeUrlParam(req.query.userId) : null;
    const countryName = req.query.countryName ? sanitizeString(req.query.countryName) : null;
    const username = req.query.username ? sanitizeString(req.query.username) : null;
    
    const currentUserId = req.user ? req.user.id : null;
    
    // Get posts using BlogDAO
    const result = await BlogDAO.getPosts(
      { page, limit, userId, countryName, username },
      currentUserId
    );
    
    res.json(result);
  } catch (error) {
    console.error('[getPosts] Error:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
}

/**
 * getPostById
 * Retrieves a single blog post by ID with comments and likes
 */
async function getPostById(req, res) {
  try {
    // Sanitize post ID
    const id = sanitizeUrlParam(req.params.id);
    const currentUserId = req.user ? req.user.id : null;
    
    // Get post with comments and reactions
    const post = await BlogDAO.getPostById(id, currentUserId);
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog post', message: error.message });
  }
}

/**
 * createPost
 * Creates a new blog post
 */
async function createPost(req, res) {
  try {
    // Sanitize content for XSS protection
    const title = sanitizeString(req.body.title);
    const content = sanitizeHtmlContent(req.body.content);
    const country_name = sanitizeString(req.body.country_name);
    const visit_date = req.body.visit_date; // No need to sanitize dates
    const user_id = req.user.id;
    
    if (!title || !content || !country_name || !visit_date) {
      return res.status(400).json({ message: 'Title, content, country name, and visit date are required' });
    }
    
    // Create post using BlogDAO
    const post = await BlogDAO.createPost({
      title,
      content,
      country_name,
      user_id,
      visit_date
    });
    
    res.status(201).json({
      id: post.id,
      message: 'Blog post created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog post', message: error.message });
  }
}

/**
 * updatePost
 * Updates a blog post
 */
async function updatePost(req, res) {
  try {
    // Sanitize inputs
    const id = sanitizeUrlParam(req.params.id);
    const userId = req.user.id;
    const title = sanitizeString(req.body.title);
    const content = sanitizeHtmlContent(req.body.content);
    const country_name = sanitizeString(req.body.country_name);
    const visit_date = req.body.visit_date; // No need to sanitize dates
    
    // Update post using BlogDAO
    const success = await BlogDAO.updatePost(id, {
      title,
      content,
      country_name,
      visit_date
    }, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Blog post not found or you do not have permission to update it' });
    }
    
    res.json({ message: 'Blog post updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog post', message: error.message });
  }
}

/**
 * deletePost
 * Deletes a blog post
 */
async function deletePost(req, res) {
  try {
    const id = sanitizeUrlParam(req.params.id);
    const userId = req.user.id;
    
    // Delete post using BlogDAO
    const success = await BlogDAO.deletePost(id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Blog post not found or you do not have permission to delete it' });
    }
    
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog post', message: error.message });
  }
}

/**
 * addComment
 * Adds a comment to a blog post
 */
async function addComment(req, res) {
  try {
    // Sanitize inputs
    const id = sanitizeUrlParam(req.params.id);
    const content = sanitizeHtmlContent(req.body.content);
    const parent_id = req.body.parent_id ? sanitizeUrlParam(req.body.parent_id) : null;
    const userId = req.user.id;
    
    // Validate content
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Add comment using BlogDAO
    const comment = await BlogDAO.addComment({
      post_id: id,
      user_id: userId,
      content,
      parent_id
    });
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment', message: error.message });
  }
}

/**
 * handleReaction
 * Handles like/dislike/remove reactions on a blog post
 */
async function handleReaction(req, res) {
  try {
    const id = sanitizeUrlParam(req.params.id);
    const action = sanitizeString(req.body.action);
    const userId = req.user.id;
    
    if (!action || !['like', 'dislike', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid reaction type. Must be like, dislike, or remove.' });
    }
    
    let result;
    
    if (action === 'remove') {
      // Remove reaction
      result = await BlogDAO.removeReaction(id, userId);
    } else {
      // Add reaction (like or dislike)
      result = await BlogDAO.addReaction({
        post_id: id,
        user_id: userId,
        reaction_type: action
      });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process reaction', message: error.message });
  }
}

/**
 * deleteComment
 * Deletes a comment from a blog post
 */
async function deleteComment(req, res) {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;
    
    // Delete comment using BlogDAO
    const success = await BlogDAO.deleteComment(commentId, id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Comment not found or you do not have permission to delete it' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment', message: error.message });
  }
}

/**
 * addReply
 * Adds a reply to a comment
 */
async function addReply(req, res) {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    // Validate content
    if (!content) {
      return res.status(400).json({ error: 'Reply content is required' });
    }
    
    // Add reply using BlogDAO
    const reply = await BlogDAO.addReply({
      post_id: id,
      comment_id: commentId,
      user_id: userId,
      content
    });
    
    res.status(201).json({
      message: 'Reply added successfully',
      reply
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply', message: error.message });
  }
}

/**
 * deleteReply
 * Deletes a reply from a comment
 */
async function deleteReply(req, res) {
  try {
    const { id, commentId, replyId } = req.params;
    const userId = req.user.id;
    
    // Delete reply using BlogDAO
    const success = await BlogDAO.deleteReply(replyId, commentId, id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Reply not found or you do not have permission to delete it' });
    }
    
    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reply', message: error.message });
  }
}

/**
 * likePost
 * Adds a like reaction to a blog post
 */
async function likePost(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Add reaction using BlogDAO
    const result = await BlogDAO.addReaction({
      post_id: id,
      user_id: userId,
      reaction_type: 'like'
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to like post', message: error.message });
  }
}

/**
 * dislikePost
 * Adds a dislike reaction to a blog post
 */
async function dislikePost(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Add reaction using BlogDAO
    const result = await BlogDAO.addReaction({
      post_id: id,
      user_id: userId,
      reaction_type: 'dislike'
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to dislike post', message: error.message });
  }
}

/**
 * followUser
 * Follows another user
 */
async function followUser(req, res) {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Prevent following yourself
    if (followerId === parseInt(userId)) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }
    
    // Check if user exists
    const userExists = await UserDAO.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if followers table exists
    try {
      const followersTableExists = await checkTableExists('followers');
      
      if (!followersTableExists) {
        // Create followers table if it doesn't exist
        await pool.query(`
          CREATE TABLE followers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL,
            following_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_follow (follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
      }
    } catch (tableError) {
      console.error('Error checking or creating followers table:', tableError);
      // Continue even if there was an error checking/creating the table
    }
    
    // Check if already following - fixed to handle undefined/null properly
    try {
      const existingFollowResults = await BlogDAO.executeQuery(
        'SELECT id FROM followers WHERE follower_id = ? AND following_id = ?',
        [followerId, userId]
      );
      
      // Properly check if we got results and if there are any rows
      if (existingFollowResults && existingFollowResults.length > 0) {
        return res.status(400).json({ error: 'You are already following this user' });
      }
      
      // Add follow relationship
      await BlogDAO.executeQuery(
        'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
        [followerId, userId]
      );
      
      res.status(201).json({ message: 'User followed successfully' });
    } catch (dbError) {
      console.error('Database error in followUser:', dbError);
      return res.status(500).json({ error: 'Database operation failed', message: dbError.message });
    }
  } catch (error) {
    console.error('Error in followUser:', error);
    res.status(500).json({ error: 'Failed to follow user', message: error.message });
  }
}

/**
 * unfollowUser
 * Unfollows a user
 */
async function unfollowUser(req, res) {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Check if followers table exists
    const followersTableExists = await checkTableExists('followers');
    if (!followersTableExists) {
      return res.status(500).json({ error: 'Following feature is not available yet' });
    }
    
    try {
      // Delete follow relationship
      const result = await BlogDAO.executeQuery(
        'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
        [followerId, userId]
      );
      
      // Check for null/undefined before accessing properties
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ error: 'You are not following this user' });
      }
      
      res.json({ message: 'User unfollowed successfully' });
    } catch (dbError) {
      console.error('Database error in unfollowUser:', dbError);
      return res.status(500).json({ error: 'Database operation failed', message: dbError.message });
    }
  } catch (error) {
    console.error('Error in unfollowUser:', error);
    res.status(500).json({ error: 'Failed to unfollow user', message: error.message });
  }
}

/**
 * getUserConnections
 * Get followers and following for a user
 */
async function getUserConnections(req, res) {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const userExists = await UserDAO.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if followers table exists
    const followersTableExists = await checkTableExists('followers');
    if (!followersTableExists) {
      // Return empty result if table doesn't exist yet
      return res.json({
        followers: [],
        following: [],
        isFollowing: false
      });
    }
    
    try {
    // Get followers (users who follow this user)
      const followers = await BlogDAO.executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
    `, [userId]);
    
    // Get following (users this user follows)
      const following = await BlogDAO.executeQuery(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name
      FROM followers f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
    `, [userId]);
    
    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
        const result = await BlogDAO.executeQuery(
        'SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?',
        [req.user.id, userId]
      );
        isFollowing = result && result.length > 0;
    }
    
    res.json({
        followers: followers || [],
        following: following || [],
      isFollowing
    });
    } catch (dbError) {
      console.error('Database error in getUserConnections:', dbError);
      // Still return data even if there's an error, just with empty arrays
      res.json({
        followers: [],
        following: [],
        isFollowing: false,
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error in getUserConnections:', error);
    res.status(500).json({ error: 'Failed to fetch user connections', message: error.message });
  }
}

/**
 * getFollowingFeed
 * Get posts from users that the current user follows
 */
async function getFollowingFeed(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Get feed using BlogDAO
    const result = await BlogDAO.getFollowingFeed(userId, { page, limit });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following feed', message: error.message });
  }
}

/**
 * getUserById
 * Get a user's profile data by ID
 */
async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await UserDAO.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user profile data
    const userProfile = await UserDAO.getUserWithProfileAndKeys(userId);
    
    // Don't expose sensitive information
    if (userProfile && userProfile.api_keys) {
      delete userProfile.api_keys;
    }
    if (userProfile) {
      delete userProfile.password_hash;
    }
    
    res.json({
      user: userProfile
    });
  } catch (error) {
    console.error('[getUserById] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user data', message: error.message });
  }
}

/**
 * getAllUsers
 * Get a list of all users for dropdown selection
 */
async function getAllUsers(req, res) {
  try {
    // Get basic user data for dropdown
    const [users] = await pool.query(`
      SELECT id, username, first_name, last_name
      FROM users
      ORDER BY username ASC
    `);
    
    res.json({
      users
    });
  } catch (error) {
    console.error('[getAllUsers] Error:', error);
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
}

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  addReply,
  deleteReply,
  handleReaction,
  likePost,
  dislikePost,
  followUser,
  unfollowUser,
  getUserConnections,
  getFollowingFeed,
  getUserById,
  getAllUsers
};
