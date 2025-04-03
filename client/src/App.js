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
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  const isAdmin = () => {
    return !!localStorage.getItem('isAdmin');
  };

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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
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
          
          {/* Admin Routes */}
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
