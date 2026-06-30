import React from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-cardBg border border-cardBg/50 p-8 rounded-2xl">
        <h2 className="text-3xl font-extrabold text-center mb-2">Welcome Back</h2>
        <p className="text-textGray text-sm text-center mb-8">Access your Cash x BD account</p>
        <div className="space-y-4">
          <button className="w-full py-3 bg-primary text-background font-bold rounded-xl hover:bg-opacity-90 transition-all">
            Temporary Login
          </button>
        </div>
        <p className="text-center text-sm text-textGray mt-6">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
