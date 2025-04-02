import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../../App.css';

// Logout component that handles user session termination
// Renders nothing visually, just performs logout actions
function Logout() {
    const navigate = useNavigate();

    // Perform logout actions immediately when component mounts
    useEffect(() => {
        // Clear all authentication data from localStorage
        // This removes token, admin status, and any other auth-related items
        localStorage.clear();
        
        // Force a page refresh to update all components
        // This ensures the navbar and other components reflect logged-out state
        window.location.reload();
        
        // Redirect user to login page after logout
        // Note: This will actually happen after reload completes
        navigate("/login");
    }, [navigate]);

    // Component doesn't render any visible UI
    // It just performs the logout actions via side effects
    return null;
}

export default Logout;
