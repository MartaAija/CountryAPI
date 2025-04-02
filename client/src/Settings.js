// Delete an API key permanently
const handleDeleteApiKey = async (keyType) => {
    try {
        if (!userDetails?.id) {
            setMessage("User details not found");
            return;
        }
        
        await axios.delete(
            `${API_BASE_URL}/delete-api-key/${userDetails.id}`,
            {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                data: { keyType }
            }
        );
        
        setMessage(`${keyType} API key deleted successfully`);
        await fetchUserData(); // Refresh user data
    } catch (error) {
        setMessage(error.response?.data?.error || "Failed to delete API key");
    }
}; 