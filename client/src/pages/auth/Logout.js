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
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('activeApiKey');
        localStorage.removeItem('isAdmin');
        
        // Dispatch custom event to update UI
        window.dispatchEvent(new Event('auth-change'));
        
        // Navigate to login page
        navigate('/login');
    }, [navigate]);

    // Component doesn't render any visible UI
    // It just performs the logout actions via side effects
    return null;
}

export default Logout;
