import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import apiClient, { formatErrorMessage } from '../../utils/apiClient';
import { getBlogApiUrl } from '../../utils/apiUtils';
import config from '../../config';
import '../../App.css';

// Helper function to format time ago
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
};

// Helper function to handle throttled requests
const handleThrottledRequest = async (requestFn, retryDelay = 2000, maxRetries = 3) => {
  let retries = 0;
  
  const executeRequest = async () => {
    try {
      return await requestFn();
    } catch (error) {
      if (error.response && error.response.status === 429 && retries < maxRetries) {
        console.warn(`Rate limited (429). Retrying in ${retryDelay}ms... (${retries + 1}/${maxRetries})`);
        retries++;
        // Wait for the retry delay
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Try again
        return executeRequest();
      }
      throw error;
    }
  };
  
  return executeRequest();
};

function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [followLoading, setFollowLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const currentUserId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  // Ensure userId is always treated as a string for comparison
  const isOwnProfile = currentUserId === String(userId);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if userId is provided
    if (!userId) {
      setError('User ID is missing');
      setLoading(false);
      return;
    }
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        let userData = null;
        // Ensure userId is a string
        const userIdString = String(userId);
        console.debug('Fetching data for userId:', userIdString);
        
        // First fetch posts and try to extract user data
        try {
          console.debug('Making API request to fetch posts');
          
          // Get the API URL and headers
          const { url, headers } = getBlogApiUrl('/posts');
          
          // Use apiClient directly for better error handling
          const postsResponse = await apiClient.get(url.replace(config.apiBaseUrl, ''), {
            params: { userId: userIdString, page: 1, limit: 10 },
            headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers
          });
          
          console.debug('API response for posts:', postsResponse.data);
          
          // Important: Check if posts is defined before setting state
          if (Array.isArray(postsResponse.data.posts)) {
            console.debug(`Setting ${postsResponse.data.posts.length} posts to state`);
            setPosts(postsResponse.data.posts);
          } else {
            console.error('Posts data is not an array:', postsResponse.data);
            setPosts([]);
          }
          
          // Extract user data from posts response
          if (postsResponse.data.user) {
            console.debug('User data found in API response:', postsResponse.data.user);
            userData = postsResponse.data.user;
            setUser(userData);
          } else if (Array.isArray(postsResponse.data.posts) && postsResponse.data.posts.length > 0) {
            console.debug('Extracting user data from first post');
            userData = {
              id: postsResponse.data.posts[0].user_id,
              username: postsResponse.data.posts[0].username,
              first_name: postsResponse.data.posts[0].first_name,
              last_name: postsResponse.data.posts[0].last_name
            };
            setUser(userData);
          }
          
          // Check pagination for more posts
          if (postsResponse.data.pagination) {
            const totalPages = postsResponse.data.pagination.totalPages || 0;
            const currentPage = postsResponse.data.pagination.currentPage || 1;
            console.debug(`Pagination: ${currentPage} of ${totalPages} pages`);
            setHasMore(currentPage < totalPages);
          }
        } catch (postError) {
          console.error('Error fetching posts:', postError);
        }
        
        // Then fetch connections (followers/following)
        try {
          console.debug('Fetching connections data');
          
          // Get the API URL and headers
          const { url, headers } = getBlogApiUrl(`/users/${userIdString}/connections`);
          console.debug(`Making connections request to: ${url}`);
          
          // Use apiClient directly for better control
          const connectionsResponse = await apiClient.get(url, {
            headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers
          });
          
          console.debug('Connections API response:', connectionsResponse.data);
          
          // If we still don't have user data but found the user in connections
          if (!userData) {
            // Look for this user in the followers list
            const followersList = connectionsResponse.data.followers || [];
            const follower = followersList.find(f => f && f.id === parseInt(userIdString));
            if (follower) {
              console.debug('Found user in followers list');
              userData = follower;
              setUser(follower);
            } else {
              // Look for this user in the following list
              const followingList = connectionsResponse.data.following || [];
              const followed = followingList.find(f => f && f.id === parseInt(userIdString));
              if (followed) {
                console.debug('Found user in following list');
                userData = followed;
                setUser(followed);
              }
            }
          }
          
          setFollowers(connectionsResponse.data.followers || []);
          setFollowing(connectionsResponse.data.following || []);
          setIsFollowing(connectionsResponse.data.isFollowing || false);
        } catch (connectionsError) {
          console.error('Error fetching connections:', {
            message: connectionsError.message,
            status: connectionsError.response?.status,
            data: connectionsError.response?.data
          });
          // Don't set error state here, just log it and continue
          // This allows the component to still try fetching user data directly
          console.debug('Will attempt to fetch user data directly instead');
          setFollowers([]);
          setFollowing([]);
          setIsFollowing(false);
        }
        
        // If we still don't have user data, try to fetch it directly
        if (!userData) {
          try {
            console.debug('Attempting to fetch user data directly');
            const { url, headers } = getBlogApiUrl(`/users/${userIdString}`);
            
            // Use apiClient directly for better error handling
            const userResponse = await apiClient.get(url, 
              { headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers }
            );
            
            if (userResponse.data && userResponse.data.user) {
              console.debug('User data fetched directly:', userResponse.data.user);
              userData = userResponse.data.user;
              setUser(userData);
            }
          } catch (userError) {
            console.error('Error fetching user data directly:', userError);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };
    
    fetchUserData();
    // Reset page when userId changes
    setPage(1);
  }, [userId, token]);
  
  // Monitor posts state for debugging
  useEffect(() => {
    console.debug('Posts state updated:', posts);
  }, [posts]);
  
  // Add effect to load additional pages when page changes
  useEffect(() => {
    // Only fetch for pages > 1 since page 1 is loaded in fetchUserData
    if (page > 1) {
      console.debug(`Loading page ${page} for userId ${userId}`);
      fetchMorePosts(page);
    }
  }, [page, userId]);
  
  const handleFollow = async () => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    setFollowLoading(true);
    try {
      // Ensure userId is a string
      const userIdString = String(userId);
      
      // Get the API URL and headers
      const action = isFollowing ? 'unfollow' : 'follow';
      console.debug(`Attempting to ${action} user ${userIdString}`);
      
      if (action === 'follow') {
        // Use POST for follow
        const { url, headers } = getBlogApiUrl(`/users/${userIdString}/follow`);
        console.debug(`Making follow request to: ${url}`);
        
        try {
          // Use apiClient directly for better error handling
          const response = await apiClient.post(
            url,
            {}, // Empty body is fine, the userId is in the URL
            { headers: { ...headers, Authorization: `Bearer ${token}` } }
          );
          console.debug('Follow response:', response.data);
        } catch (followError) {
          console.error('Follow request error details:', {
            message: followError.message,
            status: followError.response?.status,
            data: followError.response?.data,
            url
          });
          throw followError;
        }
      } else {
        // Use DELETE for unfollow
        const { url, headers } = getBlogApiUrl(`/users/${userIdString}/follow`);
        console.debug(`Making unfollow request to: ${url}`);
        
        try {
          // Use apiClient directly for better error handling
          const response = await apiClient.delete(
            url,
            { headers: { ...headers, Authorization: `Bearer ${token}` } }
          );
          console.debug('Unfollow response:', response.data);
        } catch (unfollowError) {
          console.error('Unfollow request error details:', {
            message: unfollowError.message,
            status: unfollowError.response?.status,
            data: unfollowError.response?.data,
            url
          });
          throw unfollowError;
        }
      }
      
      // Toggle the following state immediately for better UX
      setIsFollowing(!isFollowing);
      
      try {
        // Refresh connections
        const { url: connectionsUrl, headers: connectionsHeaders } = getBlogApiUrl(`/users/${userIdString}/connections`);
        console.debug(`Refreshing connections from: ${connectionsUrl}`);
        
        const connectionsResponse = await apiClient.get(
          connectionsUrl,
          { headers: { ...connectionsHeaders, Authorization: `Bearer ${token}` } }
        );
        
        console.debug('Connections refresh response:', connectionsResponse.data);
        
        // Update followers and following lists with null checks
        if (connectionsResponse && connectionsResponse.data) {
          setFollowers(connectionsResponse.data.followers || []);
          setFollowing(connectionsResponse.data.following || []);
        }
      } catch (refreshError) {
        console.error('Error refreshing connections after follow/unfollow:', {
          message: refreshError.message,
          status: refreshError.response?.status,
          data: refreshError.response?.data
        });
        // Keep UI state as is, already updated optimistically
      }
    } catch (error) {
      console.error('Error in follow/unfollow:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Revert the optimistic UI update if the API call failed
      setIsFollowing(isFollowing);
      setError(formatErrorMessage(error));
    } finally {
      setFollowLoading(false);
    }
  };
  
  const fetchMorePosts = async (pageNumber) => {
    try {
      console.debug(`Fetching additional posts for page ${pageNumber}`);
      
      // Ensure userId is a string
      const userIdString = String(userId);
      
      // Get the API URL and headers
      const { url, headers } = getBlogApiUrl('/posts');
      
      // Use apiClient directly for better error handling
      const response = await apiClient.get(url, {
        params: { userId: userIdString, page: pageNumber, limit: 10 },
        headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers
      });
      
      console.debug('Additional posts response:', response.data);
      
      // Append to existing posts
      if (Array.isArray(response.data.posts)) {
        setPosts(prevPosts => [...prevPosts, ...response.data.posts]);
      }
      
      // Check if there are more pages to load
      const currentPage = response.data.pagination?.currentPage || 1;
      const totalPages = response.data.pagination?.totalPages || 1;
      console.debug(`Pagination updated: ${currentPage} of ${totalPages}`);
      setHasMore(currentPage < totalPages);
    } catch (err) {
      console.error('Error fetching more posts:', err);
      setError(formatErrorMessage(err));
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };
  
  // Handle reaction (like/dislike) for posts
  const handleReaction = async (postId, action) => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      // Get the API URL and headers
      const { url, headers } = getBlogApiUrl(`/posts/${postId}/reaction`);
      
      // Use apiClient directly for better error handling
      await apiClient.post(
        url,
        { action },
        { headers: { ...headers, Authorization: `Bearer ${token}` } }
      );
      
      // Update the post in our local state
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === postId) {
            const wasLiked = post.userReaction === 'like';
            const wasDisliked = post.userReaction === 'dislike';
            
            // Calculate new like/dislike counts
            let likesCount = post.likes_count || 0;
            let dislikesCount = post.dislikes_count || 0;
            
            if (action === 'like') {
              if (wasLiked) {
                // No change, should not happen since we would use 'remove'
              } else if (wasDisliked) {
                // Changing from dislike to like
                likesCount += 1;
                dislikesCount = Math.max(0, dislikesCount - 1);
              } else {
                // New like
                likesCount += 1;
              }
            } else if (action === 'dislike') {
              if (wasDisliked) {
                // No change, should not happen since we would use 'remove'
              } else if (wasLiked) {
                // Changing from like to dislike
                dislikesCount += 1;
                likesCount = Math.max(0, likesCount - 1);
              } else {
                // New dislike
                dislikesCount += 1;
              }
            } else if (action === 'remove') {
              if (wasLiked) {
                likesCount = Math.max(0, likesCount - 1);
              } else if (wasDisliked) {
                dislikesCount = Math.max(0, dislikesCount - 1);
              }
            }
            
            return {
              ...post,
              likes_count: likesCount,
              dislikes_count: dislikesCount,
              userReaction: action === 'remove' ? null : action
            };
          }
          return post;
        })
      );
    } catch (error) {
      setError(formatErrorMessage(error));
    }
  };
  
  if (loading) {
    return <div className="loading-spinner">Loading profile...</div>;
  }
  
  if (!user) {
    return (
      <div className="page-container">
        <div className="message error-message">
          {error || 'User not found'}
        </div>
        <Link to="/blog" className="btn-primary">Back to Blog</Link>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <div className="user-profile">
        <div className="profile-header">
          <div className="profile-info">
            <h1>{user.first_name} {user.last_name}</h1>
            <p className="username">@{user.username}</p>
            
            <div className="profile-stats">
              <div className="stat">
                <span className="count">{posts.length}</span> Stories
              </div>
              <div className="stat">
                <span className="count">{followers.length}</span> Followers
              </div>
              <div className="stat">
                <span className="count">{following.length}</span> Following
              </div>
            </div>
            
            {!isOwnProfile && token && (
              <div className="profile-actions">
                <button
                  onClick={handleFollow}
                  className={`follow-btn ${isFollowing ? 'following' : ''}`}
                  disabled={followLoading}
                >
                  {followLoading
                    ? 'Loading...'
                    : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('posts');
              setError('');
            }}
          >
            Travel Stories
          </button>
          <button
            className={`tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('followers');
              setError('');
            }}
          >
            Followers
          </button>
          <button
            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('following');
              setError('');
            }}
          >
            Following
          </button>
        </div>
        
        {activeTab === 'posts' && (
          <div className="profile-posts">
            <h2>Travel Stories</h2>
            
            {posts.length > 0 ? (
              <>
                <div className="posts-grid">
                  {posts.map(post => (
                    <div key={post.id} className="post-card">
                      <h2>{post.title}</h2>
                      <p className="post-excerpt">{post.content.substring(0, 150)}...</p>
                      <div className="post-meta">
                        <span>📍 {post.country_name}</span>
                        <span className="post-date">🗓️ Visit: {new Date(post.visit_date).toLocaleDateString()}</span>
                        <span className="post-date">📝 Posted: {getTimeAgo(post.created_at)}</span>
                      </div>
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
                        Read Full Story
                      </Link>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <button 
                    className="load-more-button" 
                    onClick={loadMore} 
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </>
            ) : (
              <p className="no-content-message">
                {isOwnProfile 
                  ? "You haven't shared any travel stories yet." 
                  : "This user hasn't shared any travel stories yet."}
              </p>
            )}
          </div>
        )}
        
        {activeTab === 'followers' && (
          <div className="profile-connections">
            <h2>Followers</h2>
            
            {followers.length > 0 ? (
              <div className="connections-grid">
                {followers.map(follower => (
                  <Link 
                    key={follower.id} 
                    to={`/blog/user/${follower.id}`}
                    className="user-card"
                  >
                    <div className="user-info">
                      <h3>{follower.first_name} {follower.last_name}</h3>
                      <p className="username">@{follower.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="no-content-message">
                {isOwnProfile 
                  ? "You don't have any followers yet." 
                  : "This user doesn't have any followers yet."}
              </p>
            )}
          </div>
        )}
        
        {activeTab === 'following' && (
          <div className="profile-connections">
            <h2>Following</h2>
            
            {following.length > 0 ? (
              <div className="connections-grid">
                {following.map(followed => (
                  <Link 
                    key={followed.id} 
                    to={`/blog/user/${followed.id}`}
                    className="user-card"
                  >
                    <div className="user-info">
                      <h3>{followed.first_name} {followed.last_name}</h3>
                      <p className="username">@{followed.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="no-content-message">
                {isOwnProfile 
                  ? "You aren't following anyone yet." 
                  : "This user isn't following anyone yet."}
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="back-link">
        <Link to="/blog">← Back to All Stories</Link>
      </div>
    </div>
  );
}

export default UserProfile;
