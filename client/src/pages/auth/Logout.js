import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/authService";
import '../../App.css';

// Logout component that handles user session termination
// Renders nothing visually, just performs logout actions
function Logout() {
    const navigate = useNavigate();

    // Perform logout actions immediately when component mounts
    useEffect(() => {
        const performLogout = async () => {
            try {
                // Call the authService logout function to clear cookies
                await logout();
                
                // Also clear any extra localStorage items not handled by the logout function
                localStorage.removeItem('token');
                localStorage.removeItem('activeApiKey');
                
                console.log("Logout successful, redirecting to login page");
                
                // Navigate to login page
                navigate('/login');
            } catch (error) {
                console.error("Logout error:", error);
                // Navigate to login page even if there's an error
                navigate('/login');
            }
        };
        
        performLogout();
    }, [navigate]);

    // Component doesn't render any visible UI
    // It just performs the logout actions via side effects
    return null;
}

export default Logout;
