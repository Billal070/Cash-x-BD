import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { CONFIG as ImportedConfig } from '../config'; 
import { 
  LayoutDashboard, Play, ArrowDownToLine, Users, LogOut, 
  Lock, AlertTriangle, CheckCircle, Clock, Copy, Landmark, ShieldCheck,
  Menu, X, User, Phone, Mail, Award, ArrowUpRight,
  HelpCircle, Send, MessageSquare // <-- এখানে আইকন ৩টি সফলভাবে যুক্ত করা হয়েছে
} from 'lucide-react';

// গ্লোবাল ডিফেন্সিভ ফলব্যাক সেটিংস (যেন কোনো অবস্থায় ক্র্যাশ না করে)
const CONFIG = ImportedConfig || {
  siteName: "Earnova",
  logoUrl: "", 
  telegramLink: "https://t.me/your_channel_username", 
  adsterraLink: "https://www.example.com", 
  activationFee: 150,
  perAdReward: 5,
  referralBonus: 30,
  minWithdrawFirst: 75,
  minWithdrawSubsequent: 200,
};

// ডাটাবেজের null/undefined ক্র্যাশ প্রতিরোধক সেফ কারেন্সি ফরম্যাটার
const formatCurrency = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

// উইকিমিডিয়া কমন্সের লাইভ এবং অফিশিয়াল স্বচ্ছ CDN লোগো লিঙ্কসমূহ
const METHOD_LOGOS = {
  bkash: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/BKash_Logo.svg/320px-BKash_Logo.svg.png",
  nagad: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Nagad-png.png",
  rocket: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Rocket_mobile_banking_logo.svg/320px-Rocket_mobile_banking_logo.svg.png"
};

export default function Dashboard() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ব্রাউজার মেমোরি থেকে সর্বশেষ সক্রিয় থাকা ট্যাবটি খুঁজে বের করা
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('cashxbd_active_tab') || 'overview';
  });

  // মোবাইল মেনু এবং অ্যাক্টিভেশন পপআপ কন্ট্রোল স্টেট
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // লাইভ সেটিংস ডাটাবেজ থেকে লোড করার স্টেট
  const [dbSettings, setDbSettings] = useState(null);

  // ট্যাব পরিবর্তন হলে তা ব্রাউজার মেমোরিতে সেভ করে রাখা
  useEffect(() => {
    localStorage.setItem('cashxbd_active_tab', activeTab);
  }, [activeTab]);

  // পেমেন্ট ভেরিফিকেশন স্টেট
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paying, setPaying] = useState(false);

  // বিজ্ঞাপন স্টেটসমূহ
  const [adTimer, setAdTimer] = useState(0); 
  const [cooldown, setCooldown] = useState(0); 
  const [isWatching, setIsWatching] = useState(false);

  // উইথড্রল স্টেটসমূহ
  const [wdMethod, setWdMethod] = useState('bkash');
  const [wdNumber, setWdNumber] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [wdHistory, setWdHistory] = useState([]);
  const [submittingWd, setSubmittingWd] = useState(false);

  // প্রোফাইল এডিট স্টেটসমূহ
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // লাইভ সুপাবেস সেটিংস টেবিল থেকে ডাটা লোড করা
  useEffect(() => {
    fetchLiveSettings();
  }, []);

  const fetchLiveSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'config')
        .single();
      if (error) throw error;
      if (data) {
        setDbSettings(data);
      }
    } catch (err) {
      console.error('Database settings failed to load, using config.js backup:', err.message);
    }
  };

  // যদি লগইন না থাকে, তবে লগইন পেজে রিডাইরেক্ট করবে
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    } else if (profile) {
      setEditUsername(profile.username || '');
      setEditPhone(profile.phone || '');
    }
  }, [user, loading, navigate, profile]);

  // ১. জিনী পে (ZiniPay) অটোমেটিক পেমেন্ট ভেরিফিকেশন চেক
  useEffect(() => {
    const invoiceId = searchParams.get('invoice_id');
    if (invoiceId && user && profile && !profile.is_active && !verifyingPayment) {
      verifyUserPayment(invoiceId);
    }
  }, [searchParams, user, profile]);

  // ২. বিজ্ঞপ্তির কোলডাউন টাইমার কন্ট্রোল
  useEffect(() => {
    if (profile?.last_ad_watched_at) {
      const lastWatched = new Date(profile.last_ad_watched_at).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - lastWatched) / 1000);
      if (diff < 60) {
        setCooldown(60 - diff);
      }
    }
  }, [profile]);

  useEffect(() => {
    let interval;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  // ৩. বিজ্ঞাপন দেখার কাউন্টডাউন টাইমার
  useEffect(() => {
    let interval;
    if (isWatching && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    } else if (isWatching && adTimer === 0) {
      setIsWatching(false);
      claimAdReward();
    }
    return () => clearInterval(interval);
  }, [isWatching, adTimer]);

  // ৪. উইথড্রল হিস্ট্রি লোড করা
  useEffect(() => {
    if (user && activeTab === 'withdraw') {
      fetchWithdrawalHistory();
    }
  }, [user, activeTab]);

  const fetchWithdrawalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWdHistory(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          username: profile?.username || 'user',
          amount: activeActivationFee, 
          redirectUrl: window.location.origin + '/dashboard'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment initialization failed');

      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPaying(false);
    }
  };

  const verifyUserPayment = async (invoiceId) => {
    setVerifyingPayment(true);
    const toastId = toast.loading(`Verifying your ${activeActivationFee}৳ payment...`);
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, userId: user.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');

      if (data.success) {
        toast.success('Your profile is now Active! 🟢', { id: toastId });
        setShowActivationModal(false); // পপআপ বন্ধ করা হবে
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Payment not verified yet', { id: toastId });
    } finally {
      setVerifyingPayment(false);
      setSearchParams({});
    }
  };

  const startWatchingAd = () => {
    if (!profile.is_active) {
      setShowActivationModal(true); // ইনঅ্যাক্টিভ হলে পপআপ দেখাবে
      return;
    }
    if (profile.ads_watched_today >= 15) {
      return toast.error('You have reached the daily limit of 15 Ads!');
    }
    if (cooldown > 0) {
      return toast.error(`Please wait ${cooldown} seconds before watching next ad!`);
    }

    window.open(activeAdsterraLink, '_blank'); 

    setIsWatching(true);
    setAdTimer(15); 
    toast.success('Ad loaded! Please do not close this dashboard tab.');
  };

  const claimAdReward = async () => {
    const toastId = toast.loading(`Adding ${activePerAdReward}৳ reward to your balance...`);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      let adsCount = profile.ads_watched_today;
      if (profile.last_ad_date !== todayStr) {
        adsCount = 0; 
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          balance: profile.balance + activePerAdReward, 
          ads_watched_today: adsCount + 1,
          last_ad_watched_at: new Date().toISOString(),
          last_ad_date: todayStr
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Successfully earned ${activePerAdReward}৳! 🎉`, { id: toastId });
      setCooldown(60); 
      await refreshProfile();
    } catch (err) {
      toast.error('Failed to claim reward.', { id: toastId });
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!profile.is_active) {
      setShowActivationModal(true); // ইনঅ্যাক্টিভ হলে পপআপ দেখাবে
      return;
    }

    const amount = Number(wdAmount);

    if (!wdNumber || !wdAmount) {
      return toast.error('Please fill in all withdrawal fields');
    }

    if (profile.ads_watched_today < 15) {
      return toast.error('⚠️ You must complete all 15 daily ads before withdrawing!');
    }

    if (profile.withdrawals_count === 0) {
      if (amount < activeMinWithdrawFirst) {
        return toast.error(`Minimum amount for first withdrawal is ${activeMinWithdrawFirst} ৳`);
      }
    } else {
      if (amount < activeMinWithdrawSubsequent) {
        return toast.error(`Minimum amount for subsequent withdrawals is ${activeMinWithdrawSubsequent} ৳`);
      }
      if (profile.referral_count < 3) {
        return toast.error('⚠️ You need at least 3 active referrals for subsequent withdrawals!');
      }
    }

    if (profile.balance < amount) {
      return toast.error('Insufficient balance!');
    }

    setSubmittingWd(true);
    const fee = Number((amount * 0.067).toFixed(2)); 
    const receiveAmount = Number((amount - fee).toFixed(2));

    try {
      const { error: insertError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount,
          fee,
          receive_amount: receiveAmount,
          payment_method: wdMethod,
          payment_number: wdNumber
        });

      if (insertError) throw insertError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          balance: profile.balance - amount,
          total_withdrawn: profile.total_withdrawn + receiveAmount,
          withdrawals_count: profile.withdrawals_count + 1
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success(`Withdrawal request for ${amount}৳ submitted successfully!`);
      setWdAmount('');
      setWdNumber('');
      await refreshProfile();
      fetchWithdrawalHistory();
    } catch (err) {
      toast.error(err.message || 'Withdrawal submission failed');
    } finally {
      setSubmittingWd(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editUsername) return toast.error('Username cannot be empty');

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim().toLowerCase().replace(/\s+/g, ''),
          phone: editPhone.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully! 🟢');
      await refreshProfile();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const handleLogout = () => {
    localStorage.removeItem('cashxbd_active_tab');
    signOut();
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false); 
  };

  // সুপাবেস বা লোকাল কনফিগারেশন থেকে সেটিংস নির্ধারণ
  const activeActivationFee = dbSettings ? Number(dbSettings.activation_fee) : (CONFIG?.activationFee || 150);
  const activePerAdReward = dbSettings ? Number(dbSettings.per_ad_reward) : (CONFIG?.perAdReward || 5);
  const activeReferralBonus = dbSettings ? Number(dbSettings.referral_bonus) : (CONFIG?.referralBonus || 30);
  const activeAdsterraLink = dbSettings ? dbSettings.adsterra_link : (CONFIG?.adsterraLink || "https://www.example.com");
  const activeTelegramChannel = dbSettings ? dbSettings.telegram_channel : (CONFIG?.telegramLink || "https://t.me/your_channel");
  const activeTelegramAdmin = dbSettings ? dbSettings.telegram_admin : "https://t.me/your_admin";

  const activeMinWithdrawFirst = CONFIG?.minWithdrawFirst || 75;
  const activeMinWithdrawSubsequent = CONFIG?.minWithdrawSubsequent || 200;

  // গাণিতিক পরিসংখ্যান ক্যালকুলেট করার ফাংশন
  const totalLifetimeIncome = profile ? (Number(profile.balance) + Number(profile.total_withdrawn)) : 0;
  const referralEarnings = profile ? Number(profile.referral_count) * activeReferralBonus : 0;
  const adsEarnings = totalLifetimeIncome - referralEarnings > 0 ? totalLifetimeIncome - referralEarnings : 0;

  // লোডিং স্ক্রিন
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textGray font-semibold">Loading {CONFIG?.siteName || "Earnova"} Dashboard...</p>
      </div>
    );
  }

  // ১২. রিইউজেবল মিনিমাল সাইডবার প্রোফাইল কার্ড
  const renderSidebarProfileCard = () => (
    <div className="bg-background/40 border border-cardBg/60 rounded-2xl p-4 mb-6 flex items-center gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
        {profile?.username ? profile.username.substring(0, 1).toUpperCase() : 'U'}
      </div>
      {/* User Info */}
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-bold text-textLight mb-0.5 truncate capitalize">@{profile?.username}</h4>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${profile?.is_active ? 'bg-primary' : 'bg-red-500 animate-pulse'}`}></span>
          <span className={`text-[10px] font-bold ${profile?.is_active ? 'text-primary' : 'text-red-500'}`}>
            {profile?.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-xs font-black text-primary">৳ {formatCurrency(profile?.balance)}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-textLight flex flex-col md:flex-row">
      
      {/* মোবাইল হেডার */}
      <div className="md:hidden bg-cardBg border-b border-cardBg/50 px-5 py-4 flex items-center justify-between sticky top-0 z-40 relative">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-2 -ml-2 text-textLight hover:text-primary transition-colors focus:outline-none z-10"
        >
          <Menu className="w-6 h-6" />
        </button>

        {CONFIG?.logoUrl ? (
          <img src={CONFIG.logoUrl} alt={CONFIG?.siteName || "Earnova"} className="h-11 w-auto absolute left-1/2 -translate-x-1/2 object-contain" />
        ) : (
          <span className="text-xl font-black text-primary absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
            🟢 {CONFIG?.siteName || "Earnova"}
          </span>
        )}

        <div className="w-10"></div> 
      </div>

      {/* মোবাইল ওভারলে */}
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* মোবাইল ড্রয়ার */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-cardBg border-r border-cardBg/50 p-6 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col justify-between ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            {CONFIG?.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG?.siteName || "Earnova"} className="h-12 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black text-primary">🟢 {CONFIG?.siteName || "Earnova"}</span>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-2 text-textGray hover:text-red-500 transition-colors focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* মোবাইল প্রোফাইল কার্ড */}
          {renderSidebarProfileCard()}

          <nav className="space-y-2">
            <button
              onClick={() => handleTabChange('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => handleTabChange('watch-ads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'watch-ads' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Play className="w-5 h-5" /> Watch Ads
            </button>
            <button
              onClick={() => handleTabChange('withdraw')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <ArrowDownToLine className="w-5 h-5" /> Withdraw
            </button>
            <button
              onClick={() => handleTabChange('referrals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'referrals' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Users className="w-5 h-5" /> Referrals
            </button>
            <button
              onClick={() => handleTabChange('profile-details')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile-details' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <User className="w-5 h-5" /> Profile
            </button>
            <button
              onClick={() => handleTabChange('support-page')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'support-page' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <HelpCircle className="w-5 h-5" /> Support
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-textGray hover:text-red-500 font-bold transition-colors w-full animate-none"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </aside>

      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden md:flex w-64 bg-cardBg border-r border-cardBg/50 flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8 text-left">
            {CONFIG?.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG?.siteName || "Earnova"} className="h-11 w-auto mb-2 object-contain" />
            ) : (
              <span className="text-2xl font-black text-primary">🟢 {CONFIG?.siteName || "Earnova"}</span>
            )}
          </div>

          {/* ডেস্কটপ প্রোফাইল কার্ড */}
          {renderSidebarProfileCard()}

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('watch-ads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'watch-ads' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Play className="w-5 h-5" /> Watch Ads
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <ArrowDownToLine className="w-5 h-5" /> Withdraw
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'referrals' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Users className="w-5 h-5" /> Referrals
            </button>
            <button
              onClick={() => setActiveTab('profile-details')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile-details' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <User className="w-5 h-5" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('support-page')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'support-page' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <HelpCircle className="w-5 h-5" /> Support
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-textGray hover:text-red-500 font-bold transition-colors w-full"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 md:space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Welcome Back, {profile.username}!</h1>
              <p className="text-textGray text-xs md:text-sm">Monitor your earnings and complete tasks to cash out.</p>
            </div>

            {/* Inactive Alert Box (ইউজারদের আইডি একটিভ করার উদ্বুদ্ধ করবে) */}
            {!profile.is_active && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-textLight text-sm">Account Activation Required</h4>
                    <p className="text-xs text-textGray leading-relaxed mt-1">To start watching daily ads and unlock payment withdrawal, please sctivate your profile.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowActivationModal(true)}
                  className="px-5 py-2.5 bg-red-500 text-textLight hover:bg-opacity-90 font-bold text-xs rounded-xl shadow-md transition-all shrink-0 w-full sm:w-auto"
                >
                  Activate Now 🔓
                </button>
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-primary bg-primary/10 p-2 rounded-xl">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-textGray mb-1">Current Balance</h3>
                <p className="text-2xl md:text-3xl font-black text-primary">৳ {formatCurrency(profile.balance)}</p>
                <button onClick={() => setActiveTab('withdraw')} className="mt-4 text-xs font-bold text-accent hover:underline flex items-center gap-1">
                  Go to Withdraw <ArrowDownToLine className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-accent bg-accent/10 p-2 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-textGray mb-1">Total Referrals</h3>
                <p className="text-2xl md:text-3xl font-black text-accent">{profile.referral_count} Users</p>
                <button onClick={() => setActiveTab('referrals')} className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  View Referrals <Users className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-textLight bg-textLight/10 p-2 rounded-xl">
                  <Play className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-textGray mb-1">Today's Ads completed</h3>
                <p className="text-2xl md:text-3xl font-black text-textLight">{profile.ads_watched_today} / 15</p>
                <button onClick={() => setActiveTab('watch-ads')} className="mt-4 text-xs font-bold text-accent hover:underline flex items-center gap-1">
                  Watch Ads <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WATCH ADS */}
        {activeTab === 'watch-ads' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Ad Reward System</h1>
              <p className="text-textGray text-xs md:text-sm">Watch organic ads and earn {activePerAdReward}৳ per view.</p>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6">
              {!profile.is_active ? (
                // ইনঅ্যাক্টিভ ইউজারদের লকড স্ক্রিন
                <div className="bg-background rounded-2xl p-8 border border-cardBg text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold">Earning Feature Locked 🔒</h3>
                  <p className="text-textGray text-xs max-w-sm mx-auto leading-relaxed">
                    Account activation is required to watch daily advertisements and earn real wallet rewards.
                  </p>
                  <button
                    onClick={() => setShowActivationModal(true)}
                    className="mt-4 px-6 py-2.5 bg-primary text-background font-black rounded-xl text-xs hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all"
                  >
                    Activate Account Now
                  </button>
                </div>
              ) : (
                // অ্যাক্টিভ ইউজারদের বিজ্ঞাপন দেখার মূল কোড
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs md:text-sm font-bold text-textGray">Today's Ads limit:</span>
                    <span className="text-sm md:text-base font-black text-primary">{profile.ads_watched_today} / 15 Completed</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-3 overflow-hidden border border-cardBg mb-6">
                    <div 
                      className="bg-primary h-full transition-all duration-500" 
                      style={{ width: `${(profile.ads_watched_today / 15) * 100}%` }}
                    ></div>
                  </div>

                  {isWatching ? (
                    <div className="bg-background rounded-2xl p-6 md:p-10 border border-primary/20 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
                      <h3 className="text-lg md:text-xl font-bold">Watching Advertisement...</h3>
                      <p className="text-textGray text-xs max-w-sm mx-auto leading-relaxed">
                        Please do not navigate away or close this dashboard. Your reward will claim automatically in:
                      </p>
                      <div className="text-2xl md:text-3xl font-black text-accent flex items-center justify-center gap-1">
                        <Clock className="w-5 h-5 animate-pulse" /> {adTimer} Seconds
                      </div>
                    </div>
                  ) : cooldown > 0 ? (
                    <div className="bg-background rounded-2xl p-6 md:p-10 border border-cardBg text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold">Cooldown Active</h3>
                      <p className="text-textGray text-xs max-w-sm mx-auto leading-relaxed">
                        To keep organic values for our sponsors, please wait 60 seconds before watching another ad.
                      </p>
                      <div className="text-xl md:text-2xl font-black text-accent">
                        Cooldown: {cooldown} Seconds
                      </div>
                    </div>
                  ) : profile.ads_watched_today >= 15 ? (
                    <div className="bg-background rounded-2xl p-6 md:p-10 border border-primary/20 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold">Limit Reached!</h3>
                      <p className="text-textGray text-xs max-w-sm mx-auto">
                        Amazing job! You have watched all 15 ads for today. Please come back tomorrow to watch more.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={startWatchingAd}
                      className="w-full py-4 md:py-6 bg-primary text-background text-base md:text-lg font-black rounded-2xl hover:bg-opacity-90 shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-3"
                    >
                      <Play className="w-5 h-5 fill-background" /> Click to Watch Ad & Earn {activePerAdReward} ৳
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WITHDRAW */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6 md:space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Withdraw Earnings</h1>
              <p className="text-textGray text-xs md:text-sm">Send your withdrawal request directly to bKash, Nagad, or Rocket.</p>
            </div>

            {!profile.is_active ? (
              // ইনঅ্যাক্টিভ উইথড্রল লকড স্ক্রিন
              <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-8 text-center space-y-4 max-w-2xl">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold">Withdrawals Locked 🔒</h3>
                <p className="text-textGray text-xs max-w-sm mx-auto leading-relaxed">
                  Account activation is required to submit payout requests to payment gateways.
                </p>
                <button
                  onClick={() => setShowActivationModal(true)}
                  className="mt-4 px-6 py-2.5 bg-primary text-background font-black rounded-xl text-xs hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all"
                >
                  Activate Account Now
                </button>
              </div>
            ) : (
              // অ্যাক্টিভ ইউজারদের উইথড্রল ফর্ম
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 lg:col-span-2">
                  <form onSubmit={handleWithdraw} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-textGray mb-3">Withdraw Method</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['bkash', 'nagad', 'rocket'].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setWdMethod(method)}
                            className={`py-4 px-2 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                              wdMethod === method 
                                ? 'border-primary bg-primary/5 text-textLight shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' 
                                : 'bg-background border-cardBg text-textGray hover:border-textGray/30 hover:text-textLight'
                            }`}
                          >
                            <img 
                              src={METHOD_LOGOS[method]} 
                              alt={method} 
                              className="h-9 md:h-11 w-auto object-contain filter brightness-100 group-hover:scale-110 transition-transform duration-300" 
                            />
                            <span className="text-[10px] md:text-xs font-bold capitalize">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Receiver Account Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="01XXXXXXXXX"
                        value={wdNumber}
                        onChange={(e) => setWdNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Withdrawal Amount (৳)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 150"
                        value={wdAmount}
                        onChange={(e) => setWdAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                      />
                      <div className="mt-2 text-[10px] md:text-xs text-textGray flex justify-between">
                        <span>Gateway Fee: 6.7%</span>
                        {wdAmount && (
                          <span className="text-accent font-semibold">
                            Estimated Receive: ৳ {(Number(wdAmount) - Number(wdAmount) * 0.067).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingWd}
                      className="w-full py-4 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {submittingWd ? 'Submitting...' : 'Request Withdrawal'}
                    </button>
                  </form>
                </div>

                <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 space-y-6">
                  <h3 className="font-bold text-textLight text-sm md:text-base">Your Statistics:</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs md:text-sm border-b border-background pb-3">
                      <span className="text-textGray">Balance:</span>
                      <span className="font-bold text-primary">৳ {formatCurrency(profile.balance)}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm border-b border-background pb-3">
                      <span className="text-textGray">Today's Ads:</span>
                      <span className={`font-bold ${profile.ads_watched_today === 15 ? 'text-primary' : 'text-red-500'}`}>
                        {profile.ads_watched_today} / 15
                      </span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm border-b border-background pb-3">
                      <span className="text-textGray">Withdrawals Count:</span>
                      <span className="font-bold text-textLight">{profile.withdrawals_count} times</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm pb-1">
                      <span className="text-textGray">Active Referrals:</span>
                      <span className="font-bold text-accent">{profile.referral_count} Users</span>
                    </div>
                  </div>

                  <div className="p-4 bg-background border border-cardBg rounded-xl text-[10px] md:text-xs text-textGray leading-relaxed">
                    ⚠️ <strong>Note:</strong> Withdraw requests are processed manually within 24 hours. Double-check your payment numbers before requesting.
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal History */}
            {profile.is_active && (
              <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6">
                <h3 className="font-bold mb-6 text-sm md:text-base">Withdrawal History</h3>
                {wdHistory.length === 0 ? (
                  <p className="text-textGray text-xs md:text-sm text-center py-6">No withdrawal history found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-cardBg text-textGray text-xs font-semibold">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Fee (6.7%)</th>
                          <th className="pb-3">Receive</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Number</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs md:text-sm">
                        {wdHistory.map((row) => (
                          <tr key={row.id} className="border-b border-cardBg/30">
                            <td className="py-3 text-[10px] md:text-xs text-textGray">
                              {new Date(row.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 font-semibold">৳ {row.amount}</td>
                            <td className="py-3 text-red-500">৳ {row.fee}</td>
                            <td className="py-3 text-primary font-bold">৳ {row.receive_amount}</td>
                            <td className="py-3 capitalize font-semibold">{row.payment_method}</td>
                            <td className="py-3 font-medium text-textGray">{row.payment_number}</td>
                            <td className="py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${row.status === 'approved' ? 'bg-primary/10 text-primary border border-primary/20' : row.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Referral System</h1>
              <p className="text-textGray text-xs md:text-sm">Earn {activeReferralBonus}৳ reward for every active referral who signs up.</p>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 space-y-6">
              <h3 className="font-bold text-textLight text-sm md:text-base">Your Unique Referral Link:</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/register?ref=${user.id}`}
                  className="flex-1 px-4 py-3 bg-background border border-cardBg rounded-xl text-[10px] sm:text-xs text-primary font-medium focus:outline-none"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
              </div>

              <div className="bg-background/50 rounded-xl p-4 border border-cardBg text-xs text-textGray leading-relaxed">
                👉 <strong>How it works:</strong> Share this referral link with your friends. Once they register using this link and activate their profile with the ৳{activeActivationFee} account setup fee, ৳{activeReferralBonus} will be instantly added to your dashboard balance.
              </div>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-textGray text-xs md:text-sm">Your Active Referrals:</h3>
                <p className="text-textGray text-[10px] md:text-xs mt-1">Only active activated referrals are counted.</p>
              </div>
              <div className="text-3xl md:text-4xl font-black text-accent">{profile.referral_count} Users</div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & STATS */}
        {activeTab === 'profile-details' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Profile & Earnings Statistics</h1>
              <p className="text-textGray text-xs md:text-sm">View your detailed stats and update your personal information.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Left Column: Avatar and User Details */}
              <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-full h-full rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-3xl font-black text-primary select-none shadow-lg shadow-primary/15 uppercase">
                    {profile.username ? profile.username.substring(0, 2) : 'US'}
                  </div>
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary border-4 border-cardBg flex items-center justify-center" title="Active Member"></span>
                </div>

                <div>
                  <h3 className="text-xl font-black capitalize text-textLight">{profile.username}</h3>
                  <span className="text-xs text-primary font-bold bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mt-2 inline-block">
                    🟢 Active Account
                  </span>
                </div>

                <div className="text-left space-y-3 text-xs md:text-sm border-t border-background pt-6">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-textGray shrink-0" />
                    <span className="text-textGray truncate" title={profile.email}>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-textGray shrink-0" />
                    <span className="text-textGray">{profile.phone || 'Not Added'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-textGray shrink-0" />
                    <span className="text-textGray">Joined: {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Earnings breakdown & Editing Info */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-cardBg border border-cardBg/50 p-5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-textGray">Total Ads Watched Earnings</h4>
                      <p className="text-xl font-black text-primary mt-1">৳ {formatCurrency(adsEarnings)}</p>
                    </div>
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <Play className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-cardBg border border-cardBg/50 p-5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-textGray">Total Referral Earnings</h4>
                      <p className="text-xl font-black text-accent mt-1">৳ {formatCurrency(referralEarnings)}</p>
                    </div>
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-cardBg border border-cardBg/50 p-5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-textGray">Total Received Withdrawals</h4>
                      <p className="text-xl font-black text-red-500 mt-1">৳ {formatCurrency(profile.total_withdrawn)}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                      <ArrowDownToLine className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-cardBg border border-cardBg/50 p-5 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-textGray">Total Lifetime Income</h4>
                      <p className="text-xl font-black text-textLight mt-1">৳ {formatCurrency(totalLifetimeIncome)}</p>
                    </div>
                    <div className="p-3 bg-textLight/10 text-textLight rounded-xl">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Edit Information Form */}
                <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6">
                  <h3 className="font-bold text-textLight mb-6 text-sm md:text-base flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" /> Update Personal Information
                  </h3>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textGray mb-2">Username</label>
                        <input
                          type="text"
                          required
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ''))}
                          className="w-full px-4 py-2.5 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textGray mb-2">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-4 py-2.5 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="py-2.5 px-6 bg-primary text-background font-bold text-xs rounded-xl hover:bg-opacity-90 shadow-md shadow-primary/20 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {updatingProfile ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SUPPORT PAGE */}
        {activeTab === 'support-page' && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Support & Help Center</h1>
              <p className="text-textGray text-xs md:text-sm">Get in touch with us. We are active 24/7 to solve your problems.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Official Channel */}
              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-6">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-textLight">Official Telegram Channel</h3>
                    <p className="text-textGray text-xs mt-2 leading-relaxed">
                      Join our official Telegram channel to get the latest updates, payment proof screenshots, announcement news, and important notices.
                    </p>
                  </div>
                </div>

                <a
                  href={activeTelegramChannel}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-md shadow-primary/15 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4 fill-background" /> Join Telegram Channel
                </a>
              </div>

              {/* Card 2: Personal Support Admin */}
              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-6">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-accent/5 rounded-full blur-3xl"></div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-textLight">Live Admin Support</h3>
                    <p className="text-textGray text-xs mt-2 leading-relaxed">
                      Facing account activation issues, withdrawal delays, or have general queries? Click below to chat directly with our active support managers.
                    </p>
                  </div>
                </div>

                <a
                  href={activeTelegramAdmin}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 bg-accent text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-accent/15 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <MessageSquare className="w-4 h-4" /> Contact Support Admin
                </a>
              </div>
            </div>

            {/* Quick Warning Card */}
            <div className="bg-background border border-cardBg/50 rounded-2xl p-5 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-accent mb-1">Important Safety Notice</h4>
                <p className="text-[10px] md:text-xs text-textGray leading-relaxed">
                  Our official admins will never message you first or ask for your account password or bKash PIN. Always communicate only through the official support accounts linked above to stay secure.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ১২. কাস্টম অ্যাক্টিভেশন পপআপ উইন্ডো (Activation Modal - 100% Dynamic) */}
      {showActivationModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-cardBg border border-cardBg/50 p-6 md:p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setShowActivationModal(false)}
              className="absolute right-4 top-4 text-textGray hover:text-red-500 transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            
            {CONFIG?.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG?.siteName || "Earnova"} className="h-12 w-auto mx-auto mb-4 object-contain" />
            ) : (
              <span className="text-3xl font-extrabold text-primary mb-2 block">{CONFIG?.siteName || "Earnova"}</span>
            )}
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-xl font-black mb-2 text-textLight">Activate Your Account</h2>
            <p className="text-textGray text-xs mb-6 leading-relaxed">
              Pay a one-time activation fee of <span className="text-primary font-bold">৳ {activeActivationFee}</span> to unlock unlimited ads watching, daily tasks, and fast withdrawals.
            </p>

            <div className="bg-background/50 rounded-2xl p-4 border border-cardBg text-left space-y-3 mb-6">
              <h4 className="font-bold text-accent text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" /> Security Information:
              </h4>
              <ul className="text-[10px] text-textGray space-y-1.5 list-disc list-inside">
                <li>Instant automated payment verification</li>
                <li>Secure transactions via bKash, Nagad, and Rocket</li>
                <li>Automatic referral bonus payout of ৳ {activeReferralBonus}</li>
              </ul>
            </div>

            <button
              onClick={handlePayment}
              disabled={paying || verifyingPayment}
              className="w-full py-3.5 bg-primary text-background text-sm font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {paying ? 'Connecting ZiniPay...' : verifyingPayment ? 'Verifying...' : `Pay ৳ ${activeActivationFee} via ZiniPay`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
