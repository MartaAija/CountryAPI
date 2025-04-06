import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import './App.css';

function App() {
  // Check if user is authenticated by looking for a token in localStorage
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  // Check if user has admin privileges
  const isAdmin = () => {
    return !!localStorage.getItem('isAdmin');
  };

  // Custom component for protected routes that redirects unauthenticated users to login
  // Takes an optional adminRequired parameter to restrict routes to admin users only
  const PrivateRoute = ({ children, adminRequired = false }) => {
    if (adminRequired) {
      return isAdmin() ? children : <Navigate to="/login" />;
    }
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

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
        </Routes>
      </main>
    </div>
  );
}

export default App;
