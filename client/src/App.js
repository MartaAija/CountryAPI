import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './pages/components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Admin from './pages/admin/Admin';
import AdminLogin from './pages/admin/AdminLogin';
import Logout from './pages/auth/Logout';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import BlogList from './pages/blog/BlogList';
import BlogForm from './pages/blog/BlogForm';
import PostView from './pages/blog/PostView';
import UserProfile from './pages/blog/UserProfile';
import FeedPage from './pages/blog/FeedPage';
import { isAuthenticated, isAdmin } from './utils/authService';
import './App.css';

// Custom component for protected routes that redirects unauthenticated users to login
// Takes an optional adminRequired parameter to restrict routes to admin users only
const PrivateRoute = ({ children, adminRequired = false }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication status using secure cookie-based method
        const authStatus = await isAuthenticated();
        setIsAuth(authStatus);
        
        // If admin route, also check admin status
        if (adminRequired && authStatus) {
          const adminStatus = await isAdmin();
          setIsAdminUser(adminStatus);
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuth(false);
        setIsAdminUser(false);
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [adminRequired]);
  
  // Show loading state while checking authentication
  if (!authChecked) {
    return <div className="loading">Checking authentication...</div>;
  }
  
  // For admin routes, check both authentication and admin status
  if (adminRequired) {
    if (!isAuth) {
      return <Navigate to="/login" />;
    }
    
    if (!isAdminUser) {
      return <Navigate to="/dashboard" />;
    }
    
    return children;
  }
  
  // For regular protected routes, just check authentication
  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-container">
        <Routes>
          {/* Public routes accessible to all users */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail type="verification" />} />
          <Route path="/verify-password-change" element={<VerifyEmail type="password" />} />
          <Route path="/verify-email-change" element={<VerifyEmail type="email" />} />
          
          {/* Protected Routes - require authentication */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
          
          {/* Admin Routes - require admin privileges */}
          <Route path="/admin" element={
            <PrivateRoute adminRequired={true}>
              <Admin />
            </PrivateRoute>
          } />
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Blog routes */}
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/post/:id" element={<PostView />} />
          <Route path="/blog/user/:userId" element={<UserProfile />} />
          
          {/* Protected blog routes */}
          <Route path="/blog/create" element={
            <PrivateRoute>
              <BlogForm />
            </PrivateRoute>
          } />
          <Route path="/blog/edit/:id" element={
            <PrivateRoute>
              <BlogForm />
            </PrivateRoute>
          } />
          <Route path="/blog/feed" element={
            <PrivateRoute>
              <FeedPage />
            </PrivateRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
