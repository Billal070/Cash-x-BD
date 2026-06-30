import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// আমরা পরে এই পেজগুলোর ফাইল তৈরি করব
// আপাতত ফাইল তৈরি না হওয়া পর্যন্ত আমরা ডামি ভিউ রাখছি
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  return (
    <Router>
      {/* নোটিফিকেশনের জন্য প্রফেশনাল টোস্টার */}
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
        
        {/* ভুল কোনো লিংকে গেলে অটোমেটিক হোম পেজে নিয়ে যাবে */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
