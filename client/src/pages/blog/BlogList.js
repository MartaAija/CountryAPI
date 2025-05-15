import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../App.css';
import { blogApiGet, blogApiPost } from '../../utils/apiUtils';
import { formatErrorMessage } from '../../utils/apiClient';

function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCountry, setFilterCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchTimeoutId, setSearchTimeoutId] = useState(null);
  const [users, setUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // Construct query parameters for filtering
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', 10);
      
      if (filterCountry) {
        queryParams.append('countryName', filterCountry);
      }
      
      if (searchUsername) {
        queryParams.append('username', searchUsername);
      }
      
      // Use the new blogApiGet function that automatically uses apiClient
      const response = await blogApiGet(`/posts?${queryParams.toString()}`);
      setPosts(response.data.posts);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(formatErrorMessage(error));
      setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filterCountry, searchUsername]);

  useEffect(() => {
    // Fetch countries for filter dropdown
    const fetchCountries = async () => {
      try {
        // For external APIs, continue using axios directly
        const response = await axios.get('https://restcountries.com/v3.1/all');
        
        const formattedCountries = response.data.map(country => ({
          name: country.name.common,
          flag: country.flags?.png
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCountries(formattedCountries);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries();
    fetchUsers();
  }, []);

  // Fetch all users for dropdown
  const fetchUsers = async () => {
    try {
      const response = await blogApiGet('/users');
      
      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage, filterCountry, sortBy, fetchPosts]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };

  const handleCountryFilter = (e) => {
    setFilterCountry(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Handle username search with debounce
  const handleUsernameSearch = (e) => {
    const value = e.target.value;
    
    // Update the input field value immediately for UI responsiveness
    setSearchUsername(value);
    
    // Clear any existing timeout
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
    }
    
    // Set a timeout to delay the search (debounce)
    const timeoutId = setTimeout(() => {
      // Only trigger the API call when the user stops typing
      fetchPosts();
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms delay
    
    setSearchTimeoutId(timeoutId);
  };

  const handleUserSelect = (username) => {
    setSearchUsername(username);
    setShowUserDropdown(false);
    setCurrentPage(1); // Reset to first page when user is selected
  };

  // Filter users based on input
  const filteredUsers = users.filter(user => 
    user.username && user.username.toLowerCase().includes(searchUsername.toLowerCase())
  );

  const handleReaction = async (postId, action) => {
    if (!token) {
      navigate('/login', { state: { from: '/blog' } });
      return;
    }

    try {
      // Use the new blogApiPost function
      await blogApiPost(`/posts/${postId}/reaction`, { action });
      
      // Refresh posts to show updated reaction counts
      fetchPosts(currentPage);
    } catch (error) {
      console.error('Error handling reaction:', error);
      setError(formatErrorMessage(error));
    }
  };

  if (loading && currentPage === 1) {
    return <div className="loading-spinner">Loading blog posts...</div>;
  }

  return (
    <div className="page-container">
      <div className="blog-header">
        <h2>TravelTales: A Global Journey Through Stories</h2>
        <p className="page-subtitle">Explore travel experiences from around the world</p>
      </div>

      <div className="blog-controls">
        <div className="filter-container">
          <select 
            value={filterCountry} 
            onChange={handleCountryFilter}
            className="filter-select"
          >
            <option value="">All Countries</option>
            {countries.map(country => (
              <option key={country.name} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={handleSortChange}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="mostLiked">Most Liked</option>
            <option value="mostCommented">Most Commented</option>
          </select>
          
          <div className="username-search-container" ref={searchRef}>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchUsername}
              onChange={handleUsernameSearch}
              onFocus={() => setShowUserDropdown(true)}
              className="username-search"
            />
            {showUserDropdown && filteredUsers.length > 0 && (
              <div className="username-dropdown">
                {filteredUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="username-option"
                    onClick={() => handleUserSelect(user.username)}
                  >
                    {user.username} ({user.first_name} {user.last_name})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <Link to="/blog/create" className="share-button">
          SHARE YOUR TRAVEL STORY
        </Link>
      </div>

      {error && <div className="message error-message">{error}</div>}

      <div className="blog-posts-container">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="blog-post-card">
              <h3 className="post-title">{post.title}</h3>
              
              <div className="post-meta">
                <span className="post-country">📍 {post.country_name}</span>
                <span className="post-author">
                  By {post.first_name} {post.last_name} (@{post.username})
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
                    className="reaction-btn"
                    onClick={() => handleReaction(post.id, post.userReaction === 'like' ? 'remove' : 'like')}
                  >
                    👍 {post.likes_count || 0}
                  </button>
                </span>
                <span className="stat dislikes">
                  <button 
                    className="reaction-btn"
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
              
              <div className="post-actions">
                <Link to={`/blog/post/${post.id}`} className="read-more">
                  Read Full Story
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="no-posts-message">
            {filterCountry 
              ? `No travel stories found for ${filterCountry}. Be the first to share your experience!` 
              : 'No travel stories yet. Be the first to share your adventure!'}
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

export default BlogList;
