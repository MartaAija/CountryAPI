/**
 * Blog Data Access Object
 * Handles all database operations related to blogs, comments, and reactions
 */
const BaseDAO = require('./BaseDAO');

class BlogDAO extends BaseDAO {
  constructor() {
    super('blog_posts');
  }

  /**
   * Get posts with pagination and optional filtering
   * @param {Object} options - Query options (page, limit, userId, countryId, countryName, username)
   * @param {number|null} currentUserId - ID of the current user (for reactions)
   * @returns {Promise<Object>} - Posts with pagination info
   */
  async getPosts(options = {}, currentUserId = null) {
    try {
      const { page = 1, limit = 10, userId, countryId, countryName, username } = options;
      const offset = (page - 1) * limit;
      
      // Base query for counting total posts
      let countQuery = 'SELECT COUNT(*) as total FROM blog_posts bp';
      
      // Add necessary joins for counting
      if (countryName) {
        countQuery += ' LEFT JOIN countries c ON bp.country_id = c.id';
      }
      
      if (username) {
        countQuery += ' LEFT JOIN users u ON bp.user_id = u.id';
      }
      
      // Base query for fetching posts with user info
      let query = `
        SELECT 
          bp.id, bp.title, bp.content, bp.visit_date, bp.created_at, bp.updated_at,
          u.id AS user_id, u.username,
          u.first_name, u.last_name,
          c.name AS country_name,
          (SELECT COUNT(*) FROM comments WHERE post_id = bp.id) as comments_count,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = bp.id AND reaction_type = 'like') as likes_count,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = bp.id AND reaction_type = 'dislike') as dislikes_count
        FROM blog_posts bp
        LEFT JOIN users u ON bp.user_id = u.id
        LEFT JOIN countries c ON bp.country_id = c.id
      `;
      
      // Add conditions
      const conditions = [];
      const params = [];
      
      if (userId) {
        conditions.push('bp.user_id = ?');
        params.push(userId);
      }
      
      if (countryId) {
        conditions.push('bp.country_id = ?');
        params.push(countryId);
      }
      
      if (countryName) {
        conditions.push('c.name = ?');
        params.push(countryName);
      }
      
      // Add username search condition
      if (username) {
        conditions.push('u.username LIKE ?');
        params.push(`%${username}%`);
      }
      
      if (conditions.length) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        query += whereClause;
      }
      
      // Add group by and order by
      query += `
        GROUP BY bp.id, u.id, u.first_name, u.last_name, c.name
        ORDER BY bp.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      // Execute count query
      const [countRows] = await this.pool.query(countQuery, params);
      const totalPosts = countRows[0].total;
      const totalPages = Math.ceil(totalPosts / limit);
      
      // Execute main query with pagination
      const queryParams = [...params, parseInt(limit), parseInt(offset)];
      const [rows] = await this.pool.query(query, queryParams);
      
      // If user is authenticated, get their reactions to these posts
      if (currentUserId && rows.length > 0) {
        // Get all post IDs from the result
        const postIds = rows.map(post => post.id);
        
        // Get user's reactions to these posts
        const [userReactions] = await this.pool.query(
          'SELECT post_id, reaction_type FROM post_reactions WHERE user_id = ? AND post_id IN (?)',
          [currentUserId, postIds]
        );
        
        // Add userReaction property to each post
        rows.forEach(post => {
          const reaction = userReactions.find(r => r.post_id === post.id);
          if (reaction) {
            post.userReaction = reaction.reaction_type;
          } else {
            post.userReaction = null;
          }
        });
      }
      
      return {
        posts: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPosts
        }
      };
    } catch (error) {
      console.error('Error in BlogDAO.getPosts:', error);
      throw error;
    }
  }

  /**
   * Get a single post by ID with comments and reactions
   * @param {number} postId - The post ID
   * @param {number|null} currentUserId - ID of the current user (for reactions)
   * @returns {Promise<Object|null>} - Post with comments and reactions
   */
  async getPostById(postId, currentUserId = null) {
    try {
      // Get the post with user info and like counts
      const [posts] = await this.pool.query(`
        SELECT 
          p.id, p.title, p.content, p.visit_date, p.created_at, p.updated_at,
          u.id AS user_id, u.username,
          u.first_name, u.last_name,
          c.name AS country_name,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id AND reaction_type = 'like') AS likes_count,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id AND reaction_type = 'dislike') AS dislikes_count
        FROM blog_posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN countries c ON p.country_id = c.id
        WHERE p.id = ?
      `, [postId]);
      
      if (posts.length === 0) {
        return null;
      }
      
      const post = posts[0];
      
      // Get comments for this post
      const [comments] = await this.pool.query(`
        SELECT 
          c.id, c.content, c.created_at, c.parent_id,
          u.id AS user_id, u.username,
          u.first_name, u.last_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.parent_id IS NULL
        ORDER BY c.created_at DESC
      `, [postId]);
      
      // Get all replies for this post
      const [allReplies] = await this.pool.query(`
        SELECT 
          c.id, c.content, c.created_at, c.parent_id,
          u.id AS user_id, u.username,
          u.first_name, u.last_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.parent_id IS NOT NULL
        ORDER BY c.created_at ASC
      `, [postId]);
      
      // Organize replies by parent comment
      const commentsWithReplies = comments.map(comment => {
        const replies = allReplies.filter(reply => reply.parent_id === comment.id);
        return {
          ...comment,
          replies: replies || []
        };
      });
      
      // Check if current user has reacted to this post
      let userReaction = null;
      if (currentUserId) {
        const [reactions] = await this.pool.query(
          'SELECT reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?',
          [postId, currentUserId]
        );
        if (reactions.length > 0) {
          userReaction = reactions[0].reaction_type;
        }
      }
      
      return {
        ...post,
        comments: commentsWithReplies,
        userReaction
      };
    } catch (error) {
      console.error('Error in BlogDAO.getPostById:', error);
      throw error;
    }
  }

  /**
   * Create a new blog post
   * @param {Object} postData - Post data (title, content, country_name, user_id, visit_date)
   * @returns {Promise<Object>} - Created post with ID
   */
  async createPost(postData) {
    try {
      const { title, content, country_name, user_id, visit_date } = postData;
      
      // Get or create country
      let countryId;
      const [countries] = await this.pool.query(
        'SELECT id FROM countries WHERE name = ?',
        [country_name]
      );
      
      if (countries.length > 0) {
        countryId = countries[0].id;
      } else {
        // Create new country entry
        const [result] = await this.pool.query(
          'INSERT INTO countries (name, code) VALUES (?, ?)',
          [country_name, country_name.substring(0, 3).toUpperCase()]
        );
        countryId = result.insertId;
      }
      
      // Insert the blog post
      const [result] = await this.pool.query(
        'INSERT INTO blog_posts (title, content, country_id, user_id, visit_date) VALUES (?, ?, ?, ?, ?)',
        [title, content, countryId, user_id, visit_date]
      );
      
      return {
        id: result.insertId,
        title,
        content,
        country_name,
        country_id: countryId,
        user_id,
        visit_date
      };
    } catch (error) {
      console.error('Error in BlogDAO.createPost:', error);
      throw error;
    }
  }

  /**
   * Update a blog post
   * @param {number} postId - Post ID
   * @param {Object} postData - Updated post data
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if successful
   */
  async updatePost(postId, postData, userId) {
    try {
      // Verify post exists and belongs to user
      const [posts] = await this.pool.query(
        'SELECT user_id FROM blog_posts WHERE id = ?',
        [postId]
      );
      
      if (posts.length === 0) {
        return false;
      }
      
      if (posts[0].user_id !== userId) {
        return false;
      }
      
      const { title, content, country_name, visit_date } = postData;
      
      // Get or create country
      let countryId;
      if (country_name) {
        const [countries] = await this.pool.query(
          'SELECT id FROM countries WHERE name = ?',
          [country_name]
        );
        
        if (countries.length > 0) {
          countryId = countries[0].id;
        } else {
          // Create new country entry
          const [result] = await this.pool.query(
            'INSERT INTO countries (name, code) VALUES (?, ?)',
            [country_name, country_name.substring(0, 3).toUpperCase()]
          );
          countryId = result.insertId;
        }
      }
      
      // Build update query
      const updates = [];
      const values = [];
      
      if (title) {
        updates.push('title = ?');
        values.push(title);
      }
      
      if (content) {
        updates.push('content = ?');
        values.push(content);
      }
      
      if (countryId) {
        updates.push('country_id = ?');
        values.push(countryId);
      }
      
      if (visit_date) {
        updates.push('visit_date = ?');
        values.push(visit_date);
      }
      
      if (updates.length === 0) {
        return true; // Nothing to update
      }
      
      // Add post ID to values
      values.push(postId);
      
      // Execute update
      const [result] = await this.pool.query(
        `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in BlogDAO.updatePost:', error);
      throw error;
    }
  }

  /**
   * Delete a blog post
   * @param {number} postId - Post ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if successful
   */
  async deletePost(postId, userId) {
    try {
      // Verify post exists and belongs to user
      const [posts] = await this.pool.query(
        'SELECT user_id FROM blog_posts WHERE id = ?',
        [postId]
      );
      
      if (posts.length === 0) {
        return false;
      }
      
      if (posts[0].user_id !== userId) {
        return false;
      }
      
      // Delete the post (comments and reactions will be cascade deleted)
      const [result] = await this.pool.query(
        'DELETE FROM blog_posts WHERE id = ?',
        [postId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in BlogDAO.deletePost:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a blog post
   * @param {Object} commentData - Comment data (post_id, user_id, content, parent_id)
   * @returns {Promise<Object>} - Created comment with user info
   */
  async addComment(commentData) {
    try {
      const { post_id, user_id, content, parent_id = null } = commentData;
      
      // Verify post exists
      const [posts] = await this.pool.query(
        'SELECT id FROM blog_posts WHERE id = ?',
        [post_id]
      );
      
      if (posts.length === 0) {
        throw new Error('Blog post not found');
      }
      
      // Verify parent comment exists if provided
      if (parent_id) {
        const [comments] = await this.pool.query(
          'SELECT id FROM comments WHERE id = ? AND post_id = ?',
          [parent_id, post_id]
        );
        
        if (comments.length === 0) {
          throw new Error('Parent comment not found');
        }
      }
      
      // Insert comment
      const [result] = await this.pool.query(
        'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
        [post_id, user_id, content, parent_id]
      );
      
      // Get the new comment with user info
      const [comments] = await this.pool.query(`
        SELECT 
          c.id, c.content, c.created_at, c.parent_id,
          u.id AS user_id, u.username,
          u.first_name, u.last_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [result.insertId]);
      
      return comments[0];
    } catch (error) {
      console.error('Error in BlogDAO.addComment:', error);
      throw error;
    }
  }

  /**
   * Add or update a reaction to a blog post
   * @param {Object} reactionData - Reaction data (post_id, user_id, reaction_type)
   * @returns {Promise<Object>} - Updated reaction counts
   */
  async addReaction(reactionData) {
    try {
      const { post_id, user_id, reaction_type } = reactionData;
      
      // Check if user already reacted to this post
      const [existingReactions] = await this.pool.query(
        'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?',
        [post_id, user_id]
      );
      
      if (existingReactions.length > 0) {
        // User already reacted, update or delete
        if (existingReactions[0].reaction_type === reaction_type) {
          // Remove reaction if same type
          await this.pool.query(
            'DELETE FROM post_reactions WHERE id = ?',
            [existingReactions[0].id]
          );
        } else {
          // Update reaction type
          await this.pool.query(
            'UPDATE post_reactions SET reaction_type = ? WHERE id = ?',
            [reaction_type, existingReactions[0].id]
          );
        }
      } else {
        // Add new reaction
        await this.pool.query(
          'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
          [post_id, user_id, reaction_type]
        );
      }
      
      // Get updated reaction counts
      const [likesResult] = await this.pool.query(
        'SELECT COUNT(*) as count FROM post_reactions WHERE post_id = ? AND reaction_type = ?',
        [post_id, 'like']
      );
      
      const [dislikesResult] = await this.pool.query(
        'SELECT COUNT(*) as count FROM post_reactions WHERE post_id = ? AND reaction_type = ?',
        [post_id, 'dislike']
      );
      
      // Get user's current reaction status
      const [userReaction] = await this.pool.query(
        'SELECT reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?',
        [post_id, user_id]
      );
      
      return {
        likes_count: likesResult[0].count,
        dislikes_count: dislikesResult[0].count,
        userReaction: userReaction.length > 0 ? userReaction[0].reaction_type : null
      };
    } catch (error) {
      console.error('Error in BlogDAO.addReaction:', error);
      throw error;
    }
  }

  /**
   * Get posts from users that the current user follows
   * @param {number} userId - User ID
   * @param {Object} options - Query options (page, limit)
   * @returns {Promise<Object>} - Posts with pagination info
   */
  async getFollowingFeed(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;
      
      // Get posts from followed users
      const query = `
        SELECT 
          p.id, p.title, p.content, p.visit_date, p.created_at, p.updated_at,
          u.id AS user_id, u.username,
          u.first_name, u.last_name,
          c.name AS country_name,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id AND reaction_type = 'like') AS likes_count,
          (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id AND reaction_type = 'dislike') AS dislikes_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
        FROM blog_posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN countries c ON p.country_id = c.id
        JOIN followers f ON p.user_id = f.following_id
        WHERE f.follower_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const [posts] = await this.pool.query(query, [userId, parseInt(limit), parseInt(offset)]);
      
      // Get total count for pagination
      const [countResult] = await this.pool.query(
        `SELECT COUNT(*) AS total FROM blog_posts p 
         JOIN followers f ON p.user_id = f.following_id 
         WHERE f.follower_id = ?`, 
        [userId]
      );
      
      const totalPosts = countResult[0].total;
      const totalPages = Math.ceil(totalPosts / limit);
      
      // Get user's reactions to these posts
      const postIds = posts.map(post => post.id);
      
      if (postIds.length > 0) {
        const [userReactions] = await this.pool.query(
          'SELECT post_id, reaction_type FROM post_reactions WHERE user_id = ? AND post_id IN (?)',
          [userId, postIds]
        );
        
        // Add userReaction property to each post
        posts.forEach(post => {
          const reaction = userReactions.find(r => r.post_id === post.id);
          if (reaction) {
            post.userReaction = reaction.reaction_type;
          } else {
            post.userReaction = null;
          }
        });
      }
      
      return {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPosts
        }
      };
    } catch (error) {
      console.error('Error in BlogDAO.getFollowingFeed:', error);
      throw error;
    }
  }

  /**
   * Remove a reaction from a post
   * @param {number} postId - The post ID
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Result with success message
   */
  async removeReaction(postId, userId) {
    try {
      // Check if reaction exists
      const [existingReactions] = await this.pool.query(
        'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );
      
      if (existingReactions.length === 0) {
        return { message: 'No reaction to remove' };
      }
      
      // Delete the reaction
      await this.pool.query(
        'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );
      
      return {
        message: 'Reaction removed successfully',
        removedReaction: existingReactions[0].reaction_type
      };
    } catch (error) {
      console.error('Error in BlogDAO.removeReaction:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   * @param {number} commentId - The comment ID
   * @param {number} postId - The post ID
   * @param {number} userId - The user ID (must be comment owner)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteComment(commentId, postId, userId) {
    try {
      // Check if comment exists and belongs to the user
      const [comments] = await this.pool.query(
        'SELECT id FROM comments WHERE id = ? AND post_id = ? AND user_id = ?',
        [commentId, postId, userId]
      );
      
      if (comments.length === 0) {
        return false;
      }
      
      // First delete any replies to this comment
      await this.pool.query(
        'DELETE FROM comments WHERE parent_id = ?',
        [commentId]
      );
      
      // Then delete the comment itself
      await this.pool.query(
        'DELETE FROM comments WHERE id = ?',
        [commentId]
      );
      
      return true;
    } catch (error) {
      console.error('Error in BlogDAO.deleteComment:', error);
      throw error;
    }
  }

  /**
   * Add a reply to a comment
   * @param {Object} replyData - The reply data
   * @returns {Promise<Object>} - The created reply
   */
  async addReply(replyData) {
    try {
      const { post_id, comment_id, user_id, content } = replyData;
      
      // Check if parent comment exists
      const [comments] = await this.pool.query(
        'SELECT id FROM comments WHERE id = ? AND post_id = ?',
        [comment_id, post_id]
      );
      
      if (comments.length === 0) {
        throw new Error('Parent comment not found');
      }
      
      // Insert the reply
      const [result] = await this.pool.query(
        'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
        [post_id, user_id, content, comment_id]
      );
      
      // Get the created reply with user info
      const [replies] = await this.pool.query(`
        SELECT 
          c.id, c.content, c.created_at, c.parent_id,
          u.id AS user_id, u.username,
          u.first_name, u.last_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [result.insertId]);
      
      return replies[0];
    } catch (error) {
      console.error('Error in BlogDAO.addReply:', error);
      throw error;
    }
  }

  /**
   * Delete a reply
   * @param {number} replyId - The reply ID
   * @param {number} commentId - The parent comment ID
   * @param {number} postId - The post ID
   * @param {number} userId - The user ID (must be reply owner)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteReply(replyId, commentId, postId, userId) {
    try {
      // Check if reply exists and belongs to the user
      const [replies] = await this.pool.query(
        'SELECT id FROM comments WHERE id = ? AND parent_id = ? AND post_id = ? AND user_id = ?',
        [replyId, commentId, postId, userId]
      );
      
      if (replies.length === 0) {
        return false;
      }
      
      // Delete the reply
      await this.pool.query(
        'DELETE FROM comments WHERE id = ?',
        [replyId]
      );
      
      return true;
    } catch (error) {
      console.error('Error in BlogDAO.deleteReply:', error);
      throw error;
    }
  }
}

module.exports = new BlogDAO(); 