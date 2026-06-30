import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref'); // ইউআরএল থেকে রেফার কোড নিয়ে আসা

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // সাধারণ ভ্যালিডেশন
    if (!email || !phone || !username || !password || !confirmPassword) {
      return toast.error('Please fill all the fields');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }

    setLoading(true);

    try {
      // সুপাবেসে সাইন-আপ প্রসেস শুরু
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          // সুপাবেস মেটাডাটার ভেতরে আমরা রেফার কোড ও ফোন নম্বর সেভ করব
          data: {
            referred_by: referralCode || null,
            phone: phone.trim(),
            username: username.trim().toLowerCase(),
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Registration successful!');
        // অ্যাকাউন্ট তৈরি শেষে ইউজারকে ড্যাশবোর্ডে পাঠানো হবে
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Home */}
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-textGray hover:text-primary transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-4xl font-extrabold text-primary flex justify-center items-center gap-1 mb-2">
          🟢 Cash <span className="text-accent">x</span> BD
        </h2>
        <h3 className="text-center text-2xl font-bold tracking-tight text-textLight">
          Create a new account
        </h3>
        {referralCode && (
          <p className="text-center text-xs text-accent mt-2 font-medium bg-accent/10 border border-accent/20 px-3 py-1 rounded-full max-w-max mx-auto">
            🎁 You are being referred by a friend
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cardBg py-8 px-6 shadow-xl rounded-2xl border border-cardBg/50">
          <form className="space-y-6" onSubmit={handleRegister}>
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-textGray mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textGray" />
                <input
                  type="text"
                  required
                  placeholder="enter_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))} // কোনো স্পেস বা খালি জায়গা রাখা যাবে না
                  className="pl-10 w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-textGray mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textGray" />
                <input
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-textGray mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textGray" />
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} // শুধু নম্বর ইনপুট করা যাবে
                  className="pl-10 w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-textGray mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textGray" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textGray hover:text-textLight transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-textGray mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textGray" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-background font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-textGray">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
