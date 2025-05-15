import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { blogApiGet, blogApiPost, blogApiDelete } from '../../utils/apiUtils';
import { formatErrorMessage } from '../../utils/apiClient';
import { isAuthenticated } from '../../utils/authService';
import '../../App.css';

function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        setIsUserLoggedIn(authenticated);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsUserLoggedIn(false);
      }
    };
    
    checkAuth();
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      // Use blogApiGet with throttling protection
      const response = await blogApiGet(`/posts/${id}`);
      setPost(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching post:', error);
      setError(formatErrorMessage(error));
      setLoading(false);
    }
  };

  const handleReaction = async (action) => {
    if (!isUserLoggedIn) {
      navigate('/login', { state: { from: `/blog/post/${id}` } });
      return;
    }

    try {
      // Use blogApiPost with throttling protection
      await blogApiPost(`/posts/${id}/reaction`, { action });
      fetchPost(); // Refresh post data to update counts
    } catch (error) {
      console.error('Error processing reaction:', error);
      setError(formatErrorMessage(error));
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!isUserLoggedIn) {
      navigate('/login', { state: { from: `/blog/post/${id}` } });
      return;
    }

    try {
      // Use blogApiPost with throttling protection
      await blogApiPost(`/posts/${id}/comments`, { content: comment });
      setComment('');
      fetchPost(); // Refresh to show new comment
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(formatErrorMessage(error));
    }
  };

  const handleReply = async (e, commentId) => {
    e.preventDefault();
    if (!isUserLoggedIn) {
      navigate('/login', { state: { from: `/blog/post/${id}` } });
      return;
    }

    try {
      // Use blogApiPost with throttling protection
      await blogApiPost(`/posts/${id}/comments/${commentId}/replies`, { content: replyContent });
      setReplyContent('');
      setReplyingTo(null);
      fetchPost(); // Refresh to show new reply
    } catch (error) {
      console.error('Error posting reply:', error);
      setError(formatErrorMessage(error));
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      // Use blogApiDelete with throttling protection
      await blogApiDelete(`/posts/${id}/comments/${commentId}`);
      fetchPost(); // Refresh to update comments
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError(formatErrorMessage(error));
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    try {
      // Use blogApiDelete with throttling protection
      await blogApiDelete(`/posts/${id}/comments/${commentId}/replies/${replyId}`);
      fetchPost(); // Refresh to update comments
    } catch (error) {
      console.error('Error deleting reply:', error);
      setError(formatErrorMessage(error));
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading post...</div>;
  }

  if (!post) {
    return (
      <div className="page-container">
        <div className="message error-message">{error || 'Post not found'}</div>
        <Link to="/blog" className="btn-primary">Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="blog-post-full">
        <h1 className="post-title">{post.title}</h1>
        
        <div className="post-meta">
          <span className="post-country">📍 {post.country_name}</span>
          <span className="post-author">
            ✍️ By <Link to={`/blog/user/${post.user_id}`}>
              {post.first_name} {post.last_name} (@{post.username})
            </Link>
          </span>
          <span className="post-date">
            🗓️ Visit Date: {new Date(post.visit_date).toLocaleDateString()}
          </span>
          <span className="post-date">
            📝 Posted: {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="post-content">
          {post.content}
        </div>

        <div className="post-reactions">
          <button
            onClick={() => handleReaction(post.userReaction === 'like' ? 'remove' : 'like')}
            className={`reaction-btn ${post.userReaction === 'like' ? 'active' : ''}`}
          >
            👍 {post.likes_count || 0}
          </button>
          <button
            onClick={() => handleReaction(post.userReaction === 'dislike' ? 'remove' : 'dislike')}
            className={`reaction-btn ${post.userReaction === 'dislike' ? 'active' : ''}`}
          >
            👎 {post.dislikes_count || 0}
          </button>
        </div>

        <div className="comments-section">
          <h3>Comments</h3>
          
          {isUserLoggedIn ? (
            <form onSubmit={handleComment} className="comment-form">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                required
              />
              <button type="submit">Post Comment</button>
            </form>
          ) : (
            <p className="login-prompt">
              <Link to={`/login?redirect=/blog/post/${id}`}>Log in</Link> to leave a comment
            </p>
          )}

          <div className="comments-list">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <Link to={`/blog/user/${comment.user_id}`} className="comment-author">
                      {comment.first_name} {comment.last_name} (@{post.username})
                    </Link>
                    <span className="comment-date">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {isUserLoggedIn && comment.user_id === parseInt(localStorage.getItem('userId')) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="comment-content">{comment.content}</p>
                  
                  {isUserLoggedIn && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="reply-btn"
                    >
                      Reply
                    </button>
                  )}

                  {replyingTo === comment.id && (
                    <form onSubmit={(e) => handleReply(e, comment.id)} className="reply-form">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        required
                      />
                      <div className="reply-actions">
                        <button type="submit">Post Reply</button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="replies">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="reply">
                          <div className="reply-header">
                            <Link to={`/blog/user/${reply.user_id}`} className="reply-author">
                              {reply.first_name} {reply.last_name}
                            </Link>
                            <span className="reply-date">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </span>
                            {isUserLoggedIn && reply.user_id === parseInt(localStorage.getItem('userId')) && (
                              <button
                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                                className="delete-btn"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="reply-content">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="back-link">
        <Link to="/blog">← Back to All Stories</Link>
      </div>
    </div>
  );
}

export default PostView; 