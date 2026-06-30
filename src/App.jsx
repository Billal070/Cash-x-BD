import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx'; // নতুন অ্যাডমিন পেজ ইম্পোর্ট করা হলো

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#1A2332',
              color: '#F0F6FF',
              border: '1px solid #22C55E',
            },
          }} 
        />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/admin/*" element={<Admin />} /> {/* অ্যাডমিন রাউট যুক্ত করা হলো */}
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
