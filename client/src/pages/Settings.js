import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../App.css';
import config from '../config';

// Settings component that allows users to manage their account settings,
// API keys, and security preferences
function Settings() {
    const navigate = useNavigate();
    const [userDetails, setUserDetails] = useState(null);
    const [message, setMessage] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);

    // Use config for API base URL
    const API_BASE_URL = `${config.apiBaseUrl}/auth`;

    // Fetch user profile data with authentication token
    // Memoized with useCallback to prevent unnecessary re-renders
    const fetchUserData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/profile`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            
            if (!response.data.id) {
                setMessage("Error: Incomplete user data received");
                return;
            }
            
            setUserDetails(response.data);
            setFirstName(response.data.first_name || "");
            setLastName(response.data.last_name || "");
        } catch (error) {
            setMessage("Failed to load profile");
        }
    }, [API_BASE_URL]);

    // Fetch API keys associated with the user's account
    // Memoized with useCallback to maintain referential equality
    const fetchApiKeys = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api-keys`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            setApiKeys(response.data);
        } catch (error) {
            setMessage("Failed to load API keys");
        }
    }, [API_BASE_URL, setApiKeys]);

    // Load user data and API keys when component mounts
    // Dependencies properly configured for React hooks/exhaustive-deps rule
    useEffect(() => {
        fetchUserData();
        fetchApiKeys();
    }, [fetchUserData, fetchApiKeys]);

    // Handle profile information updates (first name, last name)
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                `${API_BASE_URL}/update-profile`,
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
            await axios.delete(
                `${API_BASE_URL}/delete-account`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            // Clear authentication and redirect to login page
            localStorage.removeItem("token");
            window.dispatchEvent(new Event('storage'));
            navigate("/login");
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to delete account");
            setShowDeleteModal(false);
        }
    };

    // Handle password changes with old and new password validation
    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                `${API_BASE_URL}/change-password`, 
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            setMessage(response.data.message);
            // Clear password fields after successful update
            setOldPassword("");
            setNewPassword("");
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to change password");
        }
    };

    // Toggle API key active status (activate/deactivate)
    // When one key is activated, the other is automatically deactivated
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
            
            const response = await axios.post(
                `${API_BASE_URL}/toggle-api-key/${userDetails.id}`,
                { keyType },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            
            if (response.data.user) {
                // Update user details with the updated API key information
                setUserDetails(prevState => ({
                    ...prevState,
                    ...response.data.user
                }));
                setMessage(response.data.message);
            } else {
                throw new Error("No user data received from server");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || "Failed to toggle API key status";
            setMessage(`Error: ${errorMessage}`);
        }
    };

    // Generate a new API key (primary or secondary)
    // Subject to cooldown periods managed by the server
    const handleGenerateApiKey = async (keyType) => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/generate-api-key`,
                { keyType },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
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

    // Delete an API key permanently
    const handleDeleteApiKey = async (keyType) => {
        try {
            if (!userDetails?.id) {
                setMessage("User details not found");
                return;
            }
            
            await axios({
                method: 'DELETE',
                url: `${API_BASE_URL}/delete-api-key/${userDetails.id}`,
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                data: { keyType }
            });
            
            setMessage(`${keyType} API key deleted successfully`);
            await fetchUserData(); // Refresh user data
        } catch (error) {
            setMessage(error.response?.data?.error || "Failed to delete API key");
        }
    };

    // Helper function to determine message styling based on content
    // Returns appropriate CSS class for success or error messages
    const getMessageClass = (msg) => {
        if (msg.toLowerCase().includes('error:')) {
            return 'error-message';
        }
        return 'success-message';
    };

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
                                            className="btn-secondary"
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
                                    <button onClick={() => setIsEditing(true)}>Edit Profile</button>
                                </div>
                            )}
                        </div>

                        <div className="password-section">
                    <h3>Change Password</h3>
                            <form onSubmit={handleChangePassword} className="form-group">
                        <input
                            type="password"
                            placeholder="Old Password"
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
                        <button type="submit">Change Password</button>
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
                                        <span>{userDetails.api_key_primary}</span>
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
                                        >
                                            {userDetails.is_active_primary ? 'Deactivate' : 'Activate'}
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
                                        <span>{userDetails.api_key_secondary}</span>
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
                                        >
                                            {userDetails.is_active_secondary ? 'Deactivate' : 'Activate'}
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

            {showApiKeyModal && userDetails?.api_key && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Delete API Key</h3>
                        <p>Are you sure you want to delete this API key? This action cannot be undone.</p>
                        <div className="api-key-preview">
                            {userDetails.api_key}
                        </div>
                        <div className="controls">
                            <button 
                                className="btn-danger"
                                onClick={handleDeleteApiKey}
                            >
                                Yes, Delete API Key
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={() => setShowApiKeyModal(false)}
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

export default Settings;
