import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../App.css';
import config from '../../config';

// Admin component - administrative dashboard for managing users and API keys
// Provides interface for administrators to view and control user accounts
function Admin() {
    // State variables for users data and UI control
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();

    // Check admin authorization and load users data on component mount
    useEffect(() => {
        // Check if user is admin
        const isAdmin = localStorage.getItem('isAdmin');
        if (!isAdmin) {
            navigate('/login');
            return;
        }

        fetchUsers();
    }, [navigate]);

    // Fetch all users from the API
    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${config.apiBaseUrl}/auth/users`);
            setUsers(response.data);
        } catch (error) {
            setMessage('Failed to fetch users');
        }
    };

    // Toggle API key activation status (activate/deactivate)
    const handleToggleApiKey = async (userId, keyType, currentStatus) => {
        try {
            await axios.post(`${config.apiBaseUrl}/auth/admin/toggle-api-key/${userId}`, {
                keyType,
                is_active: !currentStatus
            });
            await fetchUsers(); // Refresh the user list
            setMessage(`${keyType} API key ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            setMessage('Failed to toggle API key');
        }
    };

    // Delete an API key for a user
    const handleDeleteApiKey = async (userId, keyType) => {
        try {
            
            // Use query parameters instead of request body for DELETE
            const response = await axios({
                method: 'DELETE',
                url: `${config.apiBaseUrl}/auth/admin/delete-api-key/${userId}`,
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                },
                params: { keyType }
            });
            
            
            if (response.data.success) {
                setMessage(`${keyType} API key deleted successfully`);
                await fetchUsers(); // Refresh the user list
            } else {
                throw new Error("API responded but deletion may have failed");
            }
        } catch (error) {
            setMessage('Failed to delete API key: ' + (error.response?.data?.error || error.message));
            // Even if there's an error response, the key might have been deleted
            // so refresh the data anyway
            await fetchUsers();
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
            await axios.delete(`${config.apiBaseUrl}/auth/admin/delete-user/${selectedUser.id}`);
            setMessage('User deleted successfully');
            setShowDeleteModal(false);
            await fetchUsers(); // Refresh the user list
        } catch (error) {
            setMessage('Failed to delete user');
            setShowDeleteModal(false);
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
                {users.map(user => (
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
                                    <p className="api-key-text">{user.api_key_primary}</p>
                                    <p>Status: {user.is_active_primary ? 'Active' : 'Inactive'}</p>
                                    {user.created_at_primary && (
                                        <p>Created: {new Date(user.created_at_primary).toLocaleString()}</p>
                                    )}
                                    {user.last_used_primary && (
                                        <p>Last Used: {new Date(user.last_used_primary).toLocaleString()}</p>
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
                                    <p className="api-key-text">{user.api_key_secondary}</p>
                                    <p>Status: {user.is_active_secondary ? 'Active' : 'Inactive'}</p>
                                    {user.created_at_secondary && (
                                        <p>Created: {new Date(user.created_at_secondary).toLocaleString()}</p>
                                    )}
                                    {user.last_used_secondary && (
                                        <p>Last Used: {new Date(user.last_used_secondary).toLocaleString()}</p>
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
                    </div>
                ))}
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
        </div>
    );
}

export default Admin; 