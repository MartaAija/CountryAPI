import { useEffect, useState, useCallback } from "react";
import apiClient, { formatErrorMessage } from '../utils/apiClient';
import { useNavigate, Link } from "react-router-dom";
import '../App.css';
import config from '../config';
import { getBlogApiUrl } from '../utils/apiUtils';

// Settings component that allows users to manage their account settings,
// API keys, and security preferences
function Settings() {
    const navigate = useNavigate();
    const [userDetails, setUserDetails] = useState(null);
    const [message, setMessage] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [email, setEmail] = useState("");
    const [oldEmail, setOldEmail] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [csrfToken, setCsrfToken] = useState("");
    const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
    const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
    
    // Add state for blog posts
    const [userPosts, setUserPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [showDeletePostModal, setShowDeletePostModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);

    // State to control API key visibility
    const [showPrimaryKey, setShowPrimaryKey] = useState(false);
    const [showSecondaryKey, setShowSecondaryKey] = useState(false);

    // Add state for tracking key operations
    const [primaryKeyLoading, setPrimaryKeyLoading] = useState(false);
    const [secondaryKeyLoading, setSecondaryKeyLoading] = useState(false);

    // Use config for API base URL
    const API_BASE_URL = `${config.apiBaseUrl}/auth`;

    // Helper function to mask API key for security
    const maskApiKey = (key) => {
        if (!key) return '';
        // Show first 4 and last 4 characters, mask the rest
        return key.substring(0, 4) + '••••••••••••' + key.substring(key.length - 4);
    };

    // Fetch CSRF token
    const fetchCsrfToken = useCallback(async () => {
        try {
            // Get CSRF token from the root endpoint
            const response = await apiClient.get('');
            if (response.data && response.data.csrfToken) {
                setCsrfToken(response.data.csrfToken);
                // Also store the token in a cookie to match what the server expects
                document.cookie = `XSRF-TOKEN=${response.data.csrfToken}; path=/; SameSite=Strict`;
            }
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
        }
    }, []);

    // Fetch user profile data with authentication token
    // Memoized with useCallback to prevent unnecessary re-renders
    const fetchUserData = useCallback(async () => {
        try {
            const response = await apiClient.get('/auth/profile');
            
            if (!response.data.id) {
                setMessage("Error: Incomplete user data received");
                return;
            }
            
            setUserDetails(response.data);
            setFirstName(response.data.first_name || "");
            setLastName(response.data.last_name || "");
            setEmail(response.data.email || "");
            setOldEmail(response.data.email || "");
            
            // Reset visibility state when loading new data
            setShowPrimaryKey(false);
            setShowSecondaryKey(false);
        } catch (error) {
            setMessage("Failed to load profile");
        }
    }, []);

    // Fetch API keys associated with the user's account
    // Memoized with useCallback to maintain referential equality
    const fetchApiKeys = useCallback(async () => {
        try {
            const response = await apiClient.get('/auth/api-keys');
            setApiKeys(response.data);
        } catch (error) {
            setMessage("Failed to load API keys");
        }
    }, [setApiKeys]);

    // Fetch user's blog posts
    const fetchUserPosts = useCallback(async () => {
        if (!userDetails?.id) return;
        
        setPostsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const { url } = getBlogApiUrl('/posts');
            const response = await apiClient.get(url, {
                params: { 
                    userId: userDetails.id,
                    page: 1,
                    limit: 50
                },
                headers
            });
            
            if (Array.isArray(response.data.posts)) {
                setUserPosts(response.data.posts);
            } else {
                setUserPosts([]);
            }
        } catch (error) {
            console.error('Failed to fetch user posts:', error);
            setMessage("Failed to load your blog posts");
        } finally {
            setPostsLoading(false);
        }
    }, [userDetails?.id]);

    // Handle reaction (like/dislike) on blog posts
    const handleReaction = async (postId, action) => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate('/login', { state: { from: '/settings' } });
            return;
        }

        try {
            const { url } = getBlogApiUrl(`/posts/${postId}/reaction`);
            await apiClient.post(
                url,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh posts data to update reaction counts
            fetchUserPosts();
        } catch (error) {
            setMessage("Failed to process reaction");
        }
    };

    // Handle profile information updates (first name, last name)
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post(
                '/auth/profile/update',
                { first_name, last_name },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            setMessage(response.data.message);
            setIsEditing(false);
            await fetchUserData(); // Refresh data after update
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to update profile");
        }
    };

    // Handle account deletion with confirmation dialog
    const handleDeleteAccount = async () => {
        try {
            await apiClient.delete('/auth/account');
            // Clear authentication and redirect to login page
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("username");
            navigate("/login");
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to delete account");
            setShowDeleteModal(false);
        }
    };

    // Handle password changes with email verification
    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            // First make sure we have the email from the user profile
            if (!email && userDetails?.email) {
                setEmail(userDetails.email);
            }
            
            const response = await apiClient.post(
                '/auth/change-password', 
                { 
                    current_password: oldPassword,
                    new_password: newPassword,
                    email: email || userDetails?.email
                },
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            setShowPasswordChangeModal(true);
            setMessage(response.data.message || "Password change verification email sent");
            // Clear password fields after successful update
            setOldPassword("");
            setNewPassword("");
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage(error.response?.data?.error || "Failed to change password");
        }
    };

    // Handle email change with verification
    const handleChangeEmail = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post(
                '/auth/change-email', 
                { 
                    current_email: oldEmail,
                    new_email: newEmail
                },
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            setShowEmailChangeModal(true);
            setMessage(response.data.message || "Email change verification link sent");
            // Clear email fields after successful update
            setNewEmail("");
        } catch (error) {
            console.error('Error changing email:', error);
            setMessage(error.response?.data?.error || "Failed to change email");
        }
    };

    // Generate a new API key (primary or secondary)
    // Subject to cooldown periods managed by the server
    const handleGenerateApiKey = async (keyType) => {
        try {
            const response = await apiClient.post(
                '/auth/generate-api-key',
                { key_type: keyType },
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            
            if (response.data.apiKey) {
                setMessage("New API key generated successfully");
                await fetchUserData(); // Refresh user data to get the new API key
            } else {
                throw new Error("No API key received");
            }
        } catch (error) {
            // Handle rate limiting/cooldown period error specifically
            if (error.response?.status === 429) {
                setMessage(error.response.data.error);
            } else {
                setMessage(error.response?.data?.error || "Failed to generate new API key");
            }
        }
    };

    // Toggle API key active status (enable/disable API key)
    const handleToggleApiKey = async (keyType) => {
        try {
            if (!userDetails?.id) {
                setMessage("Error: User details not found. Please refresh the page.");
                return;
            }

            if (!userDetails?.[`api_key_${keyType}`]) {
                setMessage(`Error: No ${keyType} API key found. Please generate an API key first.`);
                return;
            }
            
            // Set the loading state for the appropriate key
            if (keyType === 'primary') {
                setPrimaryKeyLoading(true);
            } else {
                setSecondaryKeyLoading(true);
            }
            
            // Set optimistic UI update - assume toggle is successful
            const currentStatus = userDetails?.[`is_active_${keyType}`];
            const newStatus = !currentStatus;
            
            // Update UI optimistically
            setUserDetails(prev => ({
                ...prev,
                [`is_active_${keyType}`]: newStatus
            }));
            
            
            try {
                const toggleResponse = await apiClient.post(
                `/auth/toggle-api-key/${userDetails.id}`,
                    { 
                        key_type: keyType, 
                        isActive: Boolean(newStatus) // Ensure it's a proper boolean
                    },
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
                
                if (toggleResponse.data.user) {
                    // Update user details with the updated API key information from server
                setUserDetails(prevState => ({
                    ...prevState,
                        ...toggleResponse.data.user
                }));
                    setMessage(`${keyType.charAt(0).toUpperCase() + keyType.slice(1)} API key ${newStatus ? 'activated' : 'deactivated'} successfully`);
                } else if (toggleResponse.data.message) {
                    setMessage(toggleResponse.data.message);
                    // Refresh the user data to get the latest API key status
                    await fetchUserData();
                }
            } catch (error) {
                console.error('Error toggling API key:', error);
                // Revert optimistic update on error
                setUserDetails(prev => ({
                    ...prev,
                    [`is_active_${keyType}`]: currentStatus
                }));
                
                const errorMessage = error.response?.data?.error || error.message || "Failed to toggle API key status";
                setMessage(`Error: ${errorMessage}`);
                
                // Always refresh user data after an error to ensure UI is in sync
                await fetchUserData();
            } finally {
                // Reset loading state
                if (keyType === 'primary') {
                    setPrimaryKeyLoading(false);
            } else {
                    setSecondaryKeyLoading(false);
                }
            }
        } catch (error) {
            console.error('Unexpected error in handleToggleApiKey:', error);
            setMessage(`Unexpected error: ${error.message}`);
            await fetchUserData();
            
            // Reset loading state in case of unexpected error
            if (keyType === 'primary') {
                setPrimaryKeyLoading(false);
            } else {
                setSecondaryKeyLoading(false);
            }
        }
    };

    // Delete an API key permanently
    const handleDeleteApiKey = async (keyType) => {
        try {
            if (!userDetails?.id) {
                setMessage("User details not found");
                return;
            }
            
            // Use axios delete with query parameters
            const deleteResponse = await apiClient.delete(
                `/auth/delete-api-key/${userDetails.id}?key_type=${keyType}`,
                { 
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                }
                }
            );

            if (deleteResponse.data.success) {
                setMessage(`${keyType} API key deleted successfully`);
                // Update local state if the user data was returned
                if (deleteResponse.data.user) {
                    setUserDetails(deleteResponse.data.user);
                } else {
                    // Otherwise update just the specific keys
                setUserDetails(prev => ({
                    ...prev,
                    [`api_key_${keyType}`]: null,
                    [`is_active_${keyType}`]: false,
                    [`created_at_${keyType}`]: null,
                    [`last_used_${keyType}`]: null
                }));
                await fetchUserData(); // Refresh user data
                }
            } else {
                setMessage(deleteResponse.data.message || "API key deletion successful");
                await fetchUserData(); // Refresh user data
            }
        } catch (error) {
            console.error('Error deleting API key:', error);
            setMessage(error.response?.data?.error || "Failed to delete API key");
            // Even if there's an error response, the key might have been deleted
            // so refresh the data anyway
            await fetchUserData();
        }
    };

    // Toggle API key visibility for primary key
    const togglePrimaryKeyVisibility = () => {
        setShowPrimaryKey(!showPrimaryKey);
    };

    // Toggle API key visibility for secondary key
    const toggleSecondaryKeyVisibility = () => {
        setShowSecondaryKey(!showSecondaryKey);
    };

    // Handle post deletion
    const handleDeletePost = async () => {
        if (!postToDelete) return;
        
        try {
            const { url } = getBlogApiUrl(`/posts/${postToDelete.id}`);
            await apiClient.delete(
                url,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            
            // Remove deleted post from state
            setUserPosts(prevPosts => prevPosts.filter(post => post.id !== postToDelete.id));
            setMessage("Blog post deleted successfully");
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to delete blog post");
        } finally {
            setShowDeletePostModal(false);
            setPostToDelete(null);
        }
    };
    
    // Edit a post
    const handleEditPost = (postId) => {
        navigate(`/blog/edit/${postId}`);
    };
    
    // Confirm post deletion
    const confirmDeletePost = (post) => {
        setPostToDelete(post);
        setShowDeletePostModal(true);
    };

    // Helper function to determine message styling based on content
    // Returns appropriate CSS class for success or error messages
    const getMessageClass = (msg) => {
        if (msg.toLowerCase().includes('error:')) {
            return 'error-message';
        }
        return 'success-message';
    };

    // Load user data and API keys when component mounts
    // Dependencies properly configured for React hooks/exhaustive-deps rule
    useEffect(() => {
        fetchCsrfToken();
        fetchUserData();
        fetchApiKeys();
    }, [fetchUserData, fetchApiKeys, fetchCsrfToken]);
    
    // Fetch posts when user details are loaded
    useEffect(() => {
        if (userDetails?.id) {
            fetchUserPosts();
        }
    }, [userDetails?.id, fetchUserPosts]);

    return (
        <div className="page-container">
            <h2>Account Settings</h2>
            {message && (
                <div className={`message ${getMessageClass(message)}`}>
                    {message}
                </div>
            )}
            
            {userDetails && (
                <div className="settings-grid">
                    {/* User Details Block */}
                    <div className="settings-block user-details-block">
                    <h3>User Information</h3>
                        <div className="user-info-section">
                            <div className="info-label-pair">
                                <strong>Username</strong><span>{userDetails.username}</span>
                            </div>
                            
                            {isEditing ? (
                                <form onSubmit={handleUpdateProfile} className="form-group">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={first_name}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={last_name}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                    <div className="api-key-controls">
                                        <button type="submit">Save Changes</button>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFirstName(userDetails.first_name || "");
                                                setLastName(userDetails.last_name || "");
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="info-label-pair">
                                        <strong>First Name</strong><span>{userDetails.first_name || "Not set"}</span>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Last Name</strong><span>{userDetails.last_name || "Not set"}</span>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Email</strong><span>{userDetails.email || "Not set"}</span>
                                    </div>
                                    <button onClick={() => setIsEditing(true)}>Edit Profile</button>
                                </div>
                            )}
                        </div>

                        <div className="password-section">
                            <h3>Change Password</h3>
                            <form onSubmit={handleChangePassword} className="form-group">
                                <input
                                    type="email"
                                    placeholder="Confirm Your Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button type="submit">Request Password Change</button>
                            </form>
                        </div>

                        <div className="email-section">
                            <h3>Change Email</h3>
                            <form onSubmit={handleChangeEmail} className="form-group">
                                <input
                                    type="email"
                                    placeholder="Current Email"
                                    value={oldEmail}
                                    onChange={(e) => setOldEmail(e.target.value)}
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="New Email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                />
                                <button type="submit">Request Email Change</button>
                            </form>
                        </div>
                    </div>

                    {/* API Key Management Block */}
                    <div className="settings-block api-key-block">
                        <h3>API Key Management</h3>
                        
                        {/* Primary Key Section */}
                        <div className="api-key-section">
                            <h4>Primary API Key</h4>
                            {!userDetails.api_key_primary ? (
                                <button 
                                    className="btn-success"
                                    onClick={() => handleGenerateApiKey('primary')}
                                >
                                    Generate Primary Key
                                </button>
                            ) : (
                                <div className="api-key-info">
                                    <div className="info-label-pair">
                                        <strong>API Key</strong>
                                        <div className="key-reveal-container">
                                            <span>{showPrimaryKey ? userDetails.api_key_primary : maskApiKey(userDetails.api_key_primary)}</span>
                                            <button 
                                                className="btn-secondary btn-small"
                                                onClick={togglePrimaryKeyVisibility}
                                            >
                                                {showPrimaryKey ? 'Hide' : 'Reveal'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Status</strong>
                                        <span>{userDetails.is_active_primary ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Created</strong>
                                        <span>{new Date(userDetails.created_at_primary).toLocaleString()}</span>
                                    </div>
                                    {userDetails.last_used_primary && (
                                        <div className="info-label-pair">
                                            <strong>Last Used</strong>
                                            <span>
                                                {userDetails.last_used_primary ? 
                                                    new Date(userDetails.last_used_primary).toLocaleString() : 
                                                    'Never used'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="api-key-controls">
                                        <button 
                                            className={userDetails.is_active_primary ? 'btn-warning' : 'btn-success'}
                                            onClick={() => handleToggleApiKey('primary')}
                                            disabled={primaryKeyLoading}
                                        >
                                            {primaryKeyLoading 
                                                ? 'Processing...' 
                                                : userDetails.is_active_primary ? 'Deactivate' : 'Activate'
                                            }
                                        </button>
                                        <button 
                                            className="btn-danger"
                                            onClick={() => handleDeleteApiKey('primary')}
                                        >
                                            Delete Key
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Secondary Key Section */}
                        <div className="api-key-section">
                            <h4>Secondary API Key</h4>
                            {!userDetails.api_key_secondary ? (
                                <button 
                                    className="btn-success"
                                    onClick={() => handleGenerateApiKey('secondary')}
                                >
                                    Generate Secondary Key
                                </button>
                            ) : (
                                <div className="api-key-info">
                                    <div className="info-label-pair">
                                        <strong>API Key</strong>
                                        <div className="key-reveal-container">
                                            <span>{showSecondaryKey ? userDetails.api_key_secondary : maskApiKey(userDetails.api_key_secondary)}</span>
                                            <button 
                                                className="btn-secondary btn-small"
                                                onClick={toggleSecondaryKeyVisibility}
                                            >
                                                {showSecondaryKey ? 'Hide' : 'Reveal'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Status</strong>
                                        <span>{userDetails.is_active_secondary ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="info-label-pair">
                                        <strong>Created</strong>
                                        <span>{new Date(userDetails.created_at_secondary).toLocaleString()}</span>
                                    </div>
                                    {userDetails.last_used_secondary && (
                                        <div className="info-label-pair">
                                            <strong>Last Used</strong>
                                            <span>
                                                {userDetails.last_used_secondary ? 
                                                    new Date(userDetails.last_used_secondary).toLocaleString() : 
                                                    'Never used'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="api-key-controls">
                                        <button 
                                            className={userDetails.is_active_secondary ? 'btn-warning' : 'btn-success'}
                                            onClick={() => handleToggleApiKey('secondary')}
                                            disabled={secondaryKeyLoading}
                                        >
                                            {secondaryKeyLoading 
                                                ? 'Processing...' 
                                                : userDetails.is_active_secondary ? 'Deactivate' : 'Activate'
                                            }
                                        </button>
                                        <button 
                                            className="btn-danger"
                                            onClick={() => handleDeleteApiKey('secondary')}
                                        >
                                            Delete Key
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User's Blog Posts Block - NEW */}
                    <div className="settings-block blog-posts-block">
                        <h3>Your Travel Stories</h3>
                        
                        {postsLoading ? (
                            <div className="loading-spinner">Loading your posts...</div>
                        ) : userPosts.length > 0 ? (
                            <div className="user-posts-grid">
                                {userPosts.map(post => (
                                    <div key={post.id} className="user-post-card">
                                        <div className="post-header">
                                            <h4>{post.title}</h4>
                                            <span className="post-date">
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="post-meta">
                                            <span className="post-country">📍 {post.country_name}</span>
                                        </div>
                                        <p className="post-excerpt">
                                            {post.content.substring(0, 100)}
                                            {post.content.length > 100 ? '...' : ''}
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
                                        <Link 
                                            to={`/blog/post/${post.id}`} 
                                            className="post-view-btn"
                                        >
                                            Read Full Story
                                        </Link>
                                        <div className="post-actions-row">
                                            <button 
                                                className="post-edit-btn"
                                                onClick={() => handleEditPost(post.id)}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="post-delete-btn"
                                                onClick={() => confirmDeletePost(post)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-posts-message">
                                <p>You haven't shared any travel stories yet.</p>
                                <Link to="/blog/create" className="btn-primary">
                                    Share a Travel Story
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Account Deletion Block */}
                    <div className="settings-block danger-zone-block">
                        <h3>Account Deletion</h3>
                        <p>Once you delete your account, there is no going back. Please be certain.</p>
                        <button 
                            className="btn-danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Delete Account</h3>
                        <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                        <div className="controls">
                            <button 
                                className="btn-danger"
                                onClick={handleDeleteAccount}
                            >
                                Yes, Delete My Account
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

            {/* Add Delete Post Modal */}
            {showDeletePostModal && postToDelete && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Delete Travel Story</h3>
                        <p>Are you sure you want to delete "{postToDelete.title}"? This action cannot be undone.</p>
                        <div className="controls">
                            <button 
                                className="btn-danger"
                                onClick={handleDeletePost}
                            >
                                Yes, Delete Story
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={() => {
                                    setShowDeletePostModal(false);
                                    setPostToDelete(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {showPasswordChangeModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">Password Change Requested</h3>
                        <p className="success-text">
                            A verification link has been sent to your email.
                        </p>
                        <p className="text-secondary">
                            Please check your inbox and click the link to confirm your password change.
                            For security reasons, the link will expire after 1 hour.
                        </p>
                        <div className="controls">
                            <button 
                                className="btn-primary"
                                onClick={() => setShowPasswordChangeModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Change Modal */}
            {showEmailChangeModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">Email Change Requested</h3>
                        <p className="success-text">
                            A verification link has been sent to your new email address.
                        </p>
                        <p className="text-secondary">
                            Please check the inbox of your new email and click the link to confirm the change.
                            For security reasons, the link will expire after 1 hour.
                        </p>
                        <div className="controls">
                            <button 
                                className="btn-primary"
                                onClick={() => setShowEmailChangeModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
