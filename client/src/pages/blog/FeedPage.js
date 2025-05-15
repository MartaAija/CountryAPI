import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { blogApiGet, blogApiPost } from '../../utils/apiUtils';
import { formatErrorMessage } from '../../utils/apiClient';
import { isAuthenticated } from '../../utils/authService';
import '../../App.css';

function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    fetchFeed();
      } catch (error) {
        console.error('Authentication check failed:', error);
        navigate('/login', { state: { from: location.pathname } });
      }
    };
    
    checkAuth();
  }, [navigate, currentPage, location.pathname]);
  
  const fetchFeed = async () => {
    setLoading(true);
    try {
      // Use blogApiGet with automatic throttling protection
      const response = await blogApiGet('/feed', {
        params: { page: currentPage, limit: 10 }
      });
      
      setPosts(response.data.posts);
      setTotalPages(response.data.pagination.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Feed fetch error:', error);
      setError(formatErrorMessage(error));
      setLoading(false);
    }
  };
  
  const handleReaction = async (postId, action) => {
    try {
      // Use blogApiPost with automatic throttling protection
      await blogApiPost(`/posts/${postId}/reaction`, { action });
      
      // Refresh the feed to update reaction counts
      fetchFeed();
    } catch (error) {
      console.error('Reaction error:', error);
      setError(formatErrorMessage(error));
    }
  };
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };
  
  if (loading && currentPage === 1) {
    return <div className="loading-spinner">Loading your feed...</div>;
  }
  
  return (
    <div className="page-container">
      <div className="blog-header">
        <h2>Your Travel Feed</h2>
        <p className="page-subtitle">Stories from travelers you follow</p>
      </div>
      
      {error && <div className="message error-message">{error}</div>}
      
      <div className="blog-posts-container">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="blog-post-card">
              <h3 className="post-title">{post.title}</h3>
              
              <div className="post-meta">
                <span className="post-country">
                  📍 {post.country_name}
                </span>
                <span className="post-author">
                  ✍️ By <Link to={`/blog/user/${post.user_id}`}>
                    {post.first_name} {post.last_name}
                  </Link>
                </span>
                <span className="post-date">
                  🗓️ Visit: {new Date(post.visit_date).toLocaleDateString()}
                </span>
                <span className="post-date">
                  📝 Posted: {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <p className="post-excerpt">
                {post.content.length > 200 
                  ? post.content.substring(0, 200) + '...' 
                  : post.content}
              </p>
              
              <div className="post-stats">
                <span className="stat likes">
                  <button
                    className={`reaction-btn ${post.userReaction === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, post.userReaction === 'like' ? 'remove' : 'like')}
                  >
                    👍 {post.likes_count || 0}
                  </button>
                </span>
                <span className="stat dislikes">
                  <button
                    className={`reaction-btn ${post.userReaction === 'dislike' ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, post.userReaction === 'dislike' ? 'remove' : 'dislike')}
                  >
                    👎 {post.dislikes_count || 0}
                  </button>
                </span>
                <span className="stat comments">
                  <button
                    className="reaction-btn"
                    onClick={() => navigate(`/blog/post/${post.id}`)}
                  >
                    💬 {post.comments_count || 0}
                  </button>
                </span>
              </div>
              
              <Link to={`/blog/post/${post.id}`} className="read-more">
                📖 Read Full Story
              </Link>
            </div>
          ))
        ) : (
          <div className="no-posts-message">
            <p>Your feed is empty. Follow more travelers to see their stories here!</p>
            <Link to="/blog" className="btn-primary">Discover Travelers</Link>
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="page-btn"
          >
            Previous
          </button>
          
          <span className="page-info">Page {currentPage} of {totalPages}</span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default FeedPage;
