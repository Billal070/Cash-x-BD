import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { CONFIG } from '../config'; // সেন্ট্রাল কনফিগারেশন ইম্পোর্ট করা হলো
import { 
  LayoutDashboard, Play, ArrowDownToLine, Users, LogOut, 
  Lock, AlertTriangle, CheckCircle, Clock, Copy, Landmark, ShieldCheck,
  Menu, X
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ব্রাউজার মেমোরি থেকে সর্বশেষ সক্রিয় থাকা ট্যাবটি খুঁজে বের করা
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('cashxbd_active_tab') || 'overview';
  });

  // মোবাইল মেনু কন্ট্রোল করার স্টেট
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // যদি লগইন না থাকে, তবে লগইন পেজে রিডাইরেক্ট করবে
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

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

  // ৫. জিনী পে (ZiniPay) পেমেন্ট তৈরি করার ফাংশন
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
          amount: CONFIG.activationFee, 
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

  // 6. জিনী পে পেমেন্ট ভেরিফাই করার ফাংশন
  const verifyUserPayment = async (invoiceId) => {
    setVerifyingPayment(true);
    const toastId = toast.loading(`Verifying your ${CONFIG.activationFee}৳ payment...`);
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
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Payment not verified yet', { id: toastId });
    } finally {
      setVerifyingPayment(false);
      setSearchParams({});
    }
  };

  // ७. বিজ্ঞাপন দেখা শুরু করার ফাংশন
  const startWatchingAd = () => {
    if (profile.ads_watched_today >= 15) {
      return toast.error('You have reached the daily limit of 15 Ads!');
    }
    if (cooldown > 0) {
      return toast.error(`Please wait ${cooldown} seconds before watching next ad!`);
    }

    // কনফিগারেশন ফাইল থেকে আপনার Adsterra Direct Link ওপেন হবে
    window.open(CONFIG.adsterraLink, '_blank'); 

    setIsWatching(true);
    setAdTimer(15); 
    toast.success('Ad loaded! Please do not close this dashboard tab.');
  };

  // ৮. বিজ্ঞপ্তির রিওয়ার্ড (৫৳) যোগ করার ফাংশন
  const claimAdReward = async () => {
    const toastId = toast.loading(`Adding ${CONFIG.perAdReward}৳ reward to your balance...`);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      let adsCount = profile.ads_watched_today;
      if (profile.last_ad_date !== todayStr) {
        adsCount = 0; 
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          balance: profile.balance + CONFIG.perAdReward, 
          ads_watched_today: adsCount + 1,
          last_ad_watched_at: new Date().toISOString(),
          last_ad_date: todayStr
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Successfully earned ${CONFIG.perAdReward}৳! 🎉`, { id: toastId });
      setCooldown(60); 
      await refreshProfile();
    } catch (err) {
      toast.error('Failed to claim reward.', { id: toastId });
    }
  };

  // ৯. উইথড্রল সাবমিট করার ফাংশন
  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(wdAmount);

    if (!wdNumber || !wdAmount) {
      return toast.error('Please fill in all withdrawal fields');
    }

    if (profile.ads_watched_today < 15) {
      return toast.error('⚠️ You must complete all 15 daily ads before withdrawing!');
    }

    if (profile.withdrawals_count === 0) {
      if (amount < CONFIG.minWithdrawFirst) {
        return toast.error(`Minimum amount for first withdrawal is ${CONFIG.minWithdrawFirst} ৳`);
      }
    } else {
      if (amount < CONFIG.minWithdrawSubsequent) {
        return toast.error(`Minimum amount for subsequent withdrawals is ${CONFIG.minWithdrawSubsequent} ৳`);
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

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  // লগআউট করার সময় মেমোরি রিমুভ করার ফাংশন
  const handleLogout = () => {
    localStorage.removeItem('cashxbd_active_tab');
    signOut();
  };

  // মোবাইল মেনু বন্ধ করে ট্যাব পরিবর্তন করার জন্য হেল্পার ফাংশন
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false); 
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textGray font-semibold">Loading Cash x BD Dashboard...</p>
      </div>
    );
  }

  // ১০. অ্যাকাউন্ট অ্যাক্টিভেশন পেজ
  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-cardBg border border-cardBg/50 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>

          {CONFIG.logoUrl ? (
            <img src={CONFIG.logoUrl} alt={CONFIG.siteName} className="h-16 w-auto mx-auto mb-4 object-contain" />
          ) : (
            <span className="text-4xl font-extrabold text-primary mb-2 block">Cash <span className="text-accent">x</span> BD</span>
          )}
          
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black mb-2 text-textLight">Your Account is <span className="text-red-500">Inactive</span></h2>
          <p className="text-textGray text-sm mb-6 leading-relaxed">
            Please pay a one-time activation fee of <span className="text-primary font-bold text-base">{CONFIG.activationFee} ৳</span> to unlock the system and start watching ads & completing tasks.
          </p>

          <div className="bg-background/50 rounded-2xl p-5 border border-cardBg text-left space-y-4 mb-6">
            <h4 className="font-bold text-accent text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" /> Security Information:
            </h4>
            <ul className="text-xs text-textGray space-y-2 list-disc list-inside">
              <li>Instant automated payment verification</li>
              <li>Activation takes less than 2 minutes</li>
              <li>Secure transactions via bKash, Nagad, and Rocket</li>
            </ul>
          </div>

          <button
            onClick={handlePayment}
            disabled={paying || verifyingPayment}
            className="w-full py-4 bg-primary text-background text-lg font-black rounded-2xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {paying ? 'Connecting ZiniPay...' : verifyingPayment ? 'Verifying...' : `Pay ${CONFIG.activationFee} ৳ via ZiniPay`}
          </button>

          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-2 mx-auto text-sm font-semibold text-textGray hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ১১. মূল অ্যাক্টিভ ড্যাশবোর্ড ইন্টারফেস
  return (
    <div className="min-h-screen bg-background text-textLight flex flex-col md:flex-row">
      
      {/* মোবাইল স্ক্রিনের জন্য টপ-বার (Header) - মেনু বামে, লোগো মাঝখানে */}
      <div className="md:hidden bg-cardBg border-b border-cardBg/50 px-5 py-4 flex items-center justify-between sticky top-0 z-40 relative">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-2 -ml-2 text-textLight hover:text-primary transition-colors focus:outline-none z-10"
        >
          <Menu className="w-6 h-6" />
        </button>

        {CONFIG.logoUrl ? (
          <img src={CONFIG.logoUrl} alt={CONFIG.siteName} className="h-12 w-auto absolute left-1/2 -translate-x-1/2 object-contain" />
        ) : (
          <span className="text-xl font-black text-primary absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
            🟢 Cash <span className="text-accent">x</span> BD
          </span>
        )}

        <div className="w-10"></div> 
      </div>

      {/* মোবাইল মেনুর জন্য ব্লার ব্যাকড্রপ ওভারলে */}
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* মোবাইল ড্রয়ার / সাইডবার */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-cardBg border-r border-cardBg/50 p-6 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col justify-between ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            {CONFIG.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG.siteName} className="h-12 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black text-primary">🟢 Cash <span className="text-accent">x</span> BD</span>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-2 text-textGray hover:text-red-500 transition-colors focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

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
          <div className="mb-10 text-left">
            {CONFIG.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG.siteName} className="h-16 w-auto mb-2 object-contain" />
            ) : (
              <span className="text-2xl font-black text-primary">🟢 Cash <span className="text-accent">x</span> BD</span>
            )}
            <div className="mt-2 text-xs text-textGray font-semibold bg-primary/10 border border-primary/25 rounded-full px-3 py-1 max-w-max">
              🟢 Active Profile
            </div>
          </div>

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

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-primary bg-primary/10 p-2 rounded-xl">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-textGray mb-1">Current Balance</h3>
                <p className="text-2xl md:text-3xl font-black text-primary">৳ {profile.balance.toFixed(2)}</p>
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

            {/* Requirements Card */}
            <div className="bg-cardBg/30 border border-cardBg/50 rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-textLight mb-1 text-sm md:text-base">Withdrawal Requirements Check:</h4>
                  <ul className="text-xs text-textGray space-y-1 list-disc list-inside">
                    <li>1st withdrawal requirement: Minimum {CONFIG.minWithdrawFirst} ৳</li>
                    <li>Subsequent withdrawal requirement: Minimum {CONFIG.minWithdrawSubsequent} ৳ & 3 Active referrals</li>
                    <li>You must watch all 15 daily ads on the day you request a withdrawal</li>
                  </ul>
                </div>
              </div>
              <div className="w-full lg:w-auto flex items-center justify-center bg-background border border-cardBg rounded-xl px-4 py-2 text-xs font-semibold">
                {profile.ads_watched_today === 15 ? (
                  <span className="text-primary flex items-center gap-1">🟢 Ads Completed for Today</span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">🔴 Remaining Ads: {15 - profile.ads_watched_today}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WATCH ADS */}
        {activeTab === 'watch-ads' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Ad Reward System</h1>
              <p className="text-textGray text-xs md:text-sm">Watch organic ads and earn {CONFIG.perAdReward}৳ per view.</p>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6">
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
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-background" /> Click to Watch Ad & Earn {CONFIG.perAdReward} ৳
                </button>
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
                          className={`py-3 px-2 md:px-4 rounded-xl border text-xs md:text-sm font-bold capitalize transition-all ${wdMethod === method ? 'bg-primary border-primary text-background shadow-lg shadow-primary/10' : 'bg-background border-cardBg text-textGray hover:text-textLight'}`}
                        >
                          {method}
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
                    <span className="font-bold text-primary">৳ {profile.balance.toFixed(2)}</span>
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

            {/* Withdrawal History */}
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
          </div>
        )}

        {/* TAB 4: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Referral System</h1>
              <p className="text-textGray text-xs md:text-sm">Earn {CONFIG.referralBonus}৳ reward for every active referral who signs up.</p>
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
                👉 <strong>How it works:</strong> Share this referral link with your friends. Once they register using this link and activate their profile with the ৳{CONFIG.activationFee} account setup fee, ৳{CONFIG.referralBonus} will be instantly added to your dashboard balance.
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
      </main>
    </div>
  );
}
