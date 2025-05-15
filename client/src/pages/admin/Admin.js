import  { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { formatErrorMessage } from '../../utils/apiClient';
import '../../App.css';
import { isAdmin } from '../../utils/authService';

// Admin component - administrative dashboard for managing users and API keys
// Provides interface for administrators to view and control user accounts
function Admin() {
    // State variables for users data and UI control
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // State to track visibility of API keys for each user
    const [visibleKeys, setVisibleKeys] = useState({});
    
    // State to track expanded blog sections and blog data
    const [expandedBlogs, setExpandedBlogs] = useState({});
    const [userBlogs, setUserBlogs] = useState({});
    const [loadingBlogs, setLoadingBlogs] = useState({});
    const [showDeleteBlogModal, setShowDeleteBlogModal] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState(null);

    // Fetch all users from the API
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            
            // Make API call to fetch users with credentials
            const response = await apiClient.get('/admin/users');
            
            setUsers(response.data);
            // Reset key visibility when loading new data
            setVisibleKeys({});
            setExpandedBlogs({});
            setUserBlogs({});
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage('Failed to fetch users: ' + formatErrorMessage(error));
            
            // If unauthorized, redirect to login
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Check admin authorization and load users data on component mount
    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                // Check if user is admin (properly await the async function)
                const adminStatus = await isAdmin();
                if (!adminStatus) {
                    navigate('/admin-login');
                    return;
                }
                
                // If admin, fetch users
                fetchUsers();
            } catch (error) {
                console.error('Error checking admin status:', error);
                navigate('/admin-login');
            }
        };

        checkAdminStatus();
    }, [navigate, fetchUsers]);

    // Helper function to mask API key for security
    const maskApiKey = (key) => {
        if (!key) return '';
        // Show first 4 and last 4 characters, mask the rest
        return key.substring(0, 4) + '••••••••••••' + key.substring(key.length - 4);
    };

    // Toggle visibility of a specific API key
    const toggleKeyVisibility = (userId, keyType) => {
        setVisibleKeys(prev => {
            const key = `${userId}-${keyType}`;
            return {
                ...prev,
                [key]: !prev[key]
            };
        });
    };

    // Check if a specific key is currently visible
    const isKeyVisible = (userId, keyType) => {
        const key = `${userId}-${keyType}`;
        return visibleKeys[key] || false;
    };

    // Toggle API key activation status (activate/deactivate)
    const handleToggleApiKey = async (userId, keyType, currentStatus) => {
        try {
            // Make API call to toggle key status
            await apiClient.put(`/admin/users/${userId}/api-keys/${keyType}/toggle`, {
                is_active: !currentStatus
            });
            
            setMessage(`${keyType} API key ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            
            // Update the user in the state
            setUsers(prevUsers => 
                prevUsers.map(user => {
                    if (user.id === userId) {
                        if (keyType === 'primary') {
                            return { ...user, is_active_primary: !currentStatus };
                        } else {
                            return { ...user, is_active_secondary: !currentStatus };
                        }
                    }
                    return user;
                })
            );
        } catch (error) {
            console.error('Error toggling API key:', error);
            setMessage('Failed to toggle API key: ' + formatErrorMessage(error));
        }
    };

    // Delete an API key for a user
    const handleDeleteApiKey = async (userId, keyType) => {
        try {
            // Make API call to delete key
            await apiClient.delete(`/admin/users/${userId}/api-keys/${keyType}`);
            
            setMessage(`${keyType} API key deleted successfully`);
            
            // Update the user in the state
            setUsers(prevUsers => 
                prevUsers.map(user => {
                    if (user.id === userId) {
                        if (keyType === 'primary') {
                            return { ...user, api_key_primary: null, is_active_primary: false };
                        } else {
                            return { ...user, api_key_secondary: null, is_active_secondary: false };
                        }
                    }
                    return user;
                })
            );
        } catch (error) {
            console.error('Error deleting API key:', error);
            setMessage('Failed to delete API key: ' + formatErrorMessage(error));
        }
    };

    // Open confirmation modal before deleting a user
    const handleDeleteUser = async (userId, username) => {
        setSelectedUser({ id: userId, username });
        setShowDeleteModal(true);
    };

    // Execute user deletion after confirmation
    const confirmDeleteUser = async () => {
        try {
            // Make API call to delete user
            await apiClient.delete(`/admin/users/${selectedUser.id}`);
            
            setMessage('User deleted successfully');
            setShowDeleteModal(false);
            
            // Remove the user from the state
            setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
        } catch (error) {
            console.error('Error deleting user:', error);
            setMessage('Failed to delete user: ' + formatErrorMessage(error));
            setShowDeleteModal(false);
        }
    };

    // Toggle expanded state for user's blogs
    const toggleBlogsExpanded = async (userId) => {
        // If we're expanding and don't have the blogs yet, fetch them
        if (!expandedBlogs[userId] && !userBlogs[userId]) {
            await fetchUserBlogs(userId);
        }
        
        setExpandedBlogs(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };
    
    // Fetch blogs for a specific user
    const fetchUserBlogs = async (userId) => {
        try {
            setLoadingBlogs(prev => ({ ...prev, [userId]: true }));
            
            const response = await apiClient.get(`/admin/users/${userId}/blogs`);
            
            setUserBlogs(prev => ({
                ...prev,
                [userId]: response.data.posts
            }));
        } catch (error) {
            console.error('Error fetching user blogs:', error);
            setMessage('Failed to fetch user blogs: ' + formatErrorMessage(error));
        } finally {
            setLoadingBlogs(prev => ({ ...prev, [userId]: false }));
        }
    };
    
    // Open confirmation modal before deleting a blog
    const handleDeleteBlog = (blogId, title) => {
        setSelectedBlog({ id: blogId, title });
        setShowDeleteBlogModal(true);
    };
    
    // Execute blog deletion after confirmation
    const confirmDeleteBlog = async () => {
        try {
            // Make API call to delete blog
            await apiClient.delete(`/admin/blogs/${selectedBlog.id}`);
            
            setMessage('Blog post deleted successfully');
            setShowDeleteBlogModal(false);
            
            // Remove the deleted blog from all user blogs in state
            setUserBlogs(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(userId => {
                    updated[userId] = updated[userId].filter(blog => blog.id !== selectedBlog.id);
                });
                return updated;
            });
        } catch (error) {
            console.error('Error deleting blog post:', error);
            setMessage('Failed to delete blog post: ' + formatErrorMessage(error));
            setShowDeleteBlogModal(false);
        }
    };

    // Display modal for messages (success or error notifications)
    if (message) {
        return (
            <div className="modal-overlay" onClick={() => setMessage('')}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <h3>{message.includes('Failed') ? 'Error' : 'Success'}</h3>
                    <p>{message}</p>
                    <div className="controls">
                        <button 
                            className="btn-primary"
                            onClick={() => setMessage('')}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render admin dashboard UI with user management controls
    return (
        <div className="page-container">
            <h2>Admin Dashboard</h2>
            
            {/* Users grid displaying all registered users */}
            <div className="users-grid">
                <h3 className="users-grid-title">Registered Users</h3>
                
                {loading ? (
                    <div className="loading-spinner">Loading users data...</div>
                ) : users.length > 0 ? (
                    users.map(user => (
                    <div key={user.id} className="user-card">
                        {/* User header with basic information and delete button */}
                        <div className="user-header">
                            <div>
                                <h4>Username: {user.username}</h4>
                                <p>Name: {user.first_name} {user.last_name}</p>
                            </div>
                            <button 
                                className="btn-danger"
                                onClick={() => handleDeleteUser(user.id, user.username)}
                            >
                                Delete User
                            </button>
                        </div>

                        {/* Primary API Key Section - shows details and controls */}
                        <div className="api-key-section">
                            <h5>Primary API Key</h5>
                            {user.api_key_primary && user.api_key_primary !== 'No API Key' ? (
                                <>
                                    <div className="key-reveal-container">
                                        <p className="api-key-text">
                                            {isKeyVisible(user.id, 'primary') 
                                                ? user.api_key_primary 
                                                : maskApiKey(user.api_key_primary)
                                            }
                                        </p>
                                        <button 
                                            className="btn-secondary btn-small"
                                            onClick={() => toggleKeyVisibility(user.id, 'primary')}
                                        >
                                            {isKeyVisible(user.id, 'primary') ? 'Hide' : 'Reveal'}
                                        </button>
                                    </div>
                                    <p>Status: {user.is_active_primary ? 'Active' : 'Inactive'}</p>
                                    {user.created_at_primary && (
                                        <p>Created: {new Date(user.created_at_primary).toLocaleString()}</p>
                                    )}
                                    {user.last_used_primary ? (
                                        <p>Last Used: {new Date(user.last_used_primary).toLocaleString()}</p>
                                    ) : (
                                        <p>Last Used: Never used</p>
                                    )}
                                    <div className="api-key-controls">
                                        <button
                                            className={user.is_active_primary ? 'btn-warning' : 'btn-success'}
                                            onClick={() => handleToggleApiKey(user.id, 'primary', user.is_active_primary)}
                                        >
                                            {user.is_active_primary ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            className="btn-danger"
                                            onClick={() => handleDeleteApiKey(user.id, 'primary')}
                                        >
                                            Delete Key
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p>No API Key</p>
                            )}
                        </div>

                        {/* Secondary API Key Section - shows details and controls */}
                        <div className="api-key-section">
                            <h5>Secondary API Key</h5>
                            {user.api_key_secondary && user.api_key_secondary !== 'No API Key' ? (
                                <>
                                    <div className="key-reveal-container">
                                        <p className="api-key-text">
                                            {isKeyVisible(user.id, 'secondary') 
                                                ? user.api_key_secondary 
                                                : maskApiKey(user.api_key_secondary)
                                            }
                                        </p>
                                        <button 
                                            className="btn-secondary btn-small"
                                            onClick={() => toggleKeyVisibility(user.id, 'secondary')}
                                        >
                                            {isKeyVisible(user.id, 'secondary') ? 'Hide' : 'Reveal'}
                                        </button>
                                    </div>
                                    <p>Status: {user.is_active_secondary ? 'Active' : 'Inactive'}</p>
                                    {user.created_at_secondary && (
                                        <p>Created: {new Date(user.created_at_secondary).toLocaleString()}</p>
                                    )}
                                    {user.last_used_secondary ? (
                                        <p>Last Used: {new Date(user.last_used_secondary).toLocaleString()}</p>
                                    ) : (
                                        <p>Last Used: Never used</p>
                                    )}
                                    <div className="api-key-controls">
                                        <button
                                            className={user.is_active_secondary ? 'btn-warning' : 'btn-success'}
                                            onClick={() => handleToggleApiKey(user.id, 'secondary', user.is_active_secondary)}
                                        >
                                            {user.is_active_secondary ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            className="btn-danger"
                                            onClick={() => handleDeleteApiKey(user.id, 'secondary')}
                                        >
                                            Delete Key
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p>No API Key</p>
                            )}
                        </div>
                        
                        {/* User's Blog Posts Section */}
                        <div className="blog-posts-section">
                            <div 
                                className="blog-section-header" 
                                onClick={() => toggleBlogsExpanded(user.id)}
                            >
                                <h5>Blog Posts</h5>
                                <span className="toggle-icon">
                                    {expandedBlogs[user.id] ? '▼' : '►'}
                                </span>
                            </div>
                            
                            {expandedBlogs[user.id] && (
                                <div className="blog-posts-container">
                                    {loadingBlogs[user.id] ? (
                                        <div className="loading-spinner small">Loading blog posts...</div>
                                    ) : userBlogs[user.id]?.length > 0 ? (
                                        <>
                                            <p>Total posts: {userBlogs[user.id].length}</p>
                                            <div className="blog-posts-list">
                                                {userBlogs[user.id].map(blog => (
                                                    <div key={blog.id} className="admin-blog-item">
                                                        <div className="admin-blog-header">
                                                            <h6>{blog.title}</h6>
                                                            <button
                                                                className="btn-danger btn-small"
                                                                onClick={() => handleDeleteBlog(blog.id, blog.title)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                        <div className="admin-blog-details">
                                                            <p><strong>Country:</strong> {blog.country_name || 'Unknown'}</p>
                                                            <p><strong>Visit Date:</strong> {new Date(blog.visit_date).toLocaleDateString()}</p>
                                                            <p><strong>Created:</strong> {new Date(blog.created_at).toLocaleString()}</p>
                                                            <p>
                                                                <span>👍 {blog.likes_count}</span>
                                                                <span>👎 {blog.dislikes_count}</span>
                                                                <span>💬 {blog.comments_count}</span>
                                                            </p>
                                                        </div>
                                                        <div className="admin-blog-content">
                                                            <p>{blog.content.substring(0, 150)}...</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p>This user hasn't created any blog posts yet.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="no-results-message">
                        <p>No users found in the system.</p>
                    </div>
                )}
            </div>

            {/* Confirmation modal for user deletion */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Delete User</h3>
                        <p>Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.</p>
                        <div className="controls">
                            <button 
                                className="btn-danger"
                                onClick={confirmDeleteUser}
                            >
                                Yes, Delete User
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirmation modal for blog deletion */}
            {showDeleteBlogModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Delete Blog Post</h3>
                        <p>Are you sure you want to delete the blog post "{selectedBlog?.title}"? This action cannot be undone.</p>
                        <div className="controls">
                            <button 
                                className="btn-danger"
                                onClick={confirmDeleteBlog}
                            >
                                Yes, Delete Blog Post
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={() => setShowDeleteBlogModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin; 