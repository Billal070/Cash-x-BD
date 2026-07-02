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
  HelpCircle, Send, MessageSquare,
  Megaphone, Download, Headphones, MousePointer2, Eye, ArrowRight 
} from 'lucide-react';

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

const formatCurrency = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const METHOD_LOGOS = {
  bkash: "/bkash.png",
  nagad: "/nagad.png",
  rocket: "/rocket.png"
};

const mockTasks = [
  { id: 1, title: "Watch Earnova Video Ad 1", task_type: "watch_ad", reward: 5.00, daily_limit: 5, timer_seconds: 15, ad_url: "https://www.example.com" },
  { id: 2, title: "Subscribe Official YouTube Channel", task_type: "ptc", reward: 10.00, daily_limit: 1, timer_seconds: 30, ad_url: "https://www.example.com" },
  { id: 3, title: "Join Official Telegram Announcement Group", task_type: "ptc", reward: 8.00, daily_limit: 1, timer_seconds: 20, ad_url: "https://www.example.com" }
];

// ==========================================
// NEW WATCH ADS TASK CARD COMPONENT START
// ==========================================
const TaskCard = ({ task, completedCount, onClaimed, user, profile, refreshProfile }) => {
  const [watching, setWatching] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const isLimitReached = completedCount >= task.daily_limit;
  const progressPercent = Math.min((completedCount / task.daily_limit) * 100, 100);

  useEffect(() => {
    let interval;
    if (watching && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft((prev) => prev - 1); }, 1000);
    } else if (watching && timeLeft === 0) {
      setTimerDone(true);
    }
    return () => clearInterval(interval);
  }, [watching, timeLeft]);

  const handleWatch = () => {
    window.open(task.ad_url, '_blank');
    setWatching(true);
    setTimeLeft(task.timer_seconds);
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { error: insertError } = await supabase.from('task_completions').insert({
        user_id: user.id, task_id: task.id, reward_earned: task.reward
      });
      if (insertError) throw insertError;

      const { error: profileError } = await supabase.from('profiles').update({
        balance: profile.balance + task.reward,
        total_earned: (profile.total_earned || 0) + task.reward,
        today_earned: (profile.today_earned || 0) + task.reward,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (profileError) throw profileError;

      toast.success(`৳${task.reward.toFixed(2)} credited to your balance!`);
      await refreshProfile();
      onClaimed();
      setWatching(false);
      setTimerDone(false);
    } catch (err) {
      toast.error('Failed to claim. Try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`bg-[#1A2332] border border-[#1E3A2F] rounded-xl p-3 md:p-4 space-y-3 transition-opacity ${isLimitReached ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${task.task_type === 'watch_ad' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' : 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20'}`}>
          {task.task_type === 'watch_ad' ? 'Watch Ad' : 'PTC Task'}
        </span>
        <Eye className="w-4 h-4 text-[#8AA8B8]" />
      </div>
      <div>
        <h3 className="font-semibold text-[#F0F6FF] text-sm md:text-base leading-snug">{task.title}</h3>
        {task.description && <p className="text-sm text-[#8AA8B8] mt-1 line-clamp-2">{task.description}</p>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[#FBBF24]">৳ {task.reward.toFixed(2)}</span>
        <span className="text-xs text-[#8AA8B8] flex items-center gap-1">⏱ {task.timer_seconds}s</span>
      </div>
      <div className="space-y-1.5">
        <div className="w-full h-1.5 bg-[#0D1117] rounded-full">
          <div className="h-1.5 bg-[#22C55E] rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <p className="text-xs text-[#8AA8B8]">{completedCount}/{task.daily_limit} completed today</p>
      </div>

      {isLimitReached ? (
        <div className="bg-[#8AA8B8]/10 border border-[#8AA8B8]/20 rounded-lg py-2.5 w-full text-center">
          <span className="text-[#8AA8B8] text-sm font-medium">✅ Completed for today</span>
        </div>
      ) : watching ? (
        <div className="bg-[#0D1117] border border-[#1E3A2F] rounded-xl p-4 space-y-4 text-center">
          <p className="text-xs text-[#8AA8B8]">Keep the ad tab open...</p>
          <div className="text-5xl md:text-6xl font-bold text-[#FBBF24]">{timeLeft}</div>
          <p className="text-sm text-[#8AA8B8] -mt-2">seconds left</p>
          <div className="w-full h-1.5 bg-[#0D1117] rounded-full">
            <div className="h-1.5 bg-[#22C55E] rounded-full transition-all" style={{ width: `${((task.timer_seconds - timeLeft) / task.timer_seconds) * 100}%` }}></div>
          </div>
          <p className="text-xs text-[#8AA8B8]">Watching to earn ৳{task.reward.toFixed(2)}</p>
          <button disabled={!timerDone || claiming} onClick={handleClaim} className={`w-full py-3 rounded-xl font-bold text-sm min-h-[48px] flex items-center justify-center gap-2 transition-all ${timerDone ? 'bg-[#22C55E] text-[#0D1117] hover:bg-opacity-90' : 'bg-[#1A2332] text-[#8AA8B8] cursor-not-allowed'}`}>
            {claiming ? <div className="w-5 h-5 border-2 border-[#0D1117] border-t-transparent rounded-full animate-spin"></div> : `Claim ৳${task.reward.toFixed(2)}`}
          </button>
        </div>
      ) : (
        <button onClick={handleWatch} className="w-full py-3 bg-[#22C55E] text-[#0D1117] font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 text-sm min-h-[48px]">
          <Play className="w-4 h-4 fill-[#0D1117]" /> Watch & Earn
        </button>
      )}
    </div>
  );
};
// ==========================================
// NEW WATCH ADS TASK CARD COMPONENT END
// ==========================================

export default function Dashboard() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('cashxbd_active_tab') || 'overview';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const [dbSettings, setDbSettings] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskCompletions, setTaskCompletions] = useState([]);

  const [adTimer, setAdTimer] = useState(0); 
  const [cooldown, setCooldown] = useState(0); 
  const [isWatching, setIsWatching] = useState(false);
  
  // age missing howa states gulo ekhane add kora holo
  const [paying, setPaying] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [wdMethod, setWdMethod] = useState('bkash');
  const [wdNumber, setWdNumber] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [wdHistory, setWdHistory] = useState([]);
  const [submittingWd, setSubmittingWd] = useState(false);

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

  // ডাটাবেজ থেকে লাইভ টাস্ক লোড করা
  const fetchLiveTasks = async () => {
    setLoadingTasks(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [tasksRes, completionsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('is_active', true).order('created_at'),
        supabase.from('task_completions').select('task_id, reward_earned').eq('user_id', user.id).gte('completed_at', today)
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (completionsRes.error) throw completionsRes.error;

      setTasks(tasksRes.data.length > 0 ? tasksRes.data : mockTasks);
      setTaskCompletions(completionsRes.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err.message);
      setTasks(mockTasks);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLiveTasks();
    }
  }, [user]);
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
        setShowActivationModal(false); 
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
      setShowActivationModal(true); 
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
      setShowActivationModal(true); 
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

  const activeActivationFee = dbSettings ? Number(dbSettings.activation_fee) : (CONFIG?.activationFee || 150);
  const activePerAdReward = dbSettings ? Number(dbSettings.per_ad_reward) : (CONFIG?.perAdReward || 5);
  const activeReferralBonus = dbSettings ? Number(dbSettings.referral_bonus) : (CONFIG?.referralBonus || 30);
  const activeAdsterraLink = dbSettings ? dbSettings.adsterra_link : (CONFIG?.adsterraLink || "https://www.example.com");
  const activeTelegramChannel = dbSettings ? dbSettings.telegram_channel : (CONFIG?.telegramLink || "https://t.me/your_channel");
  const activeTelegramAdmin = dbSettings ? dbSettings.telegram_admin : "https://t.me/your_admin";
  const activeAnnouncementText = dbSettings?.announcement_text || "🎉 New tasks available! Complete all tasks today and earn bonus rewards.";

 const activeMinWithdrawFirst = CONFIG?.minWithdrawFirst || 75;
  const activeMinWithdrawSubsequent = CONFIG?.minWithdrawSubsequent || 200;

  // বিজ্ঞপ্তির গ্লোবাল লিমিট ও টাইমার ভ্যালু রিড করা (নতুন যুক্ত)
  const activeDailyAdLimit = dbSettings ? Number(dbSettings.daily_ad_limit) : (CONFIG?.dailyAdLimit || 15);
  const activeAdTimer = dbSettings ? Number(dbSettings.ad_timer) : (CONFIG?.adTimer || 15);
// বিজ্ঞপ্তির গ্লোবাল লিমিট ও টাইমার ভ্যালু রিড করা (নতুন যুক্ত)
  const activeDailyAdLimit = dbSettings ? Number(dbSettings.daily_ad_limit) : (CONFIG?.dailyAdLimit || 15);
  const activeAdTimer = dbSettings ? Number(dbSettings.ad_timer) : (CONFIG?.adTimer || 15);

  // আজকের ৩টি স্ট্যাটস বক্সের গাণিতিক হিসাব (নতুন যুক্ত)
  const countMap = {};
  taskCompletions.forEach(c => { countMap[c.task_id] = (countMap[c.task_id] || 0) + 1; });
  const todayEarned = taskCompletions.reduce((acc, c) => acc + (Number(c.reward_earned) || 0), 0);
  const totalCompletedToday = Object.values(countMap).reduce((a, b) => a + b, 0);
  const remainingAds = activeDailyAdLimit - totalCompletedToday > 0 ? activeDailyAdLimit - totalCompletedToday : 0;
  const totalLifetimeIncome = profile ? (Number(profile.balance) + Number(profile.total_withdrawn)) : 0;
  const referralEarnings = profile ? Number(profile.referral_count) * activeReferralBonus : 0;
  const adsEarnings = totalLifetimeIncome - referralEarnings > 0 ? totalLifetimeIncome - referralEarnings : 0;

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textGray font-semibold">Loading {CONFIG?.siteName || "Earnova"} Dashboard...</p>
      </div>
    );
  }

  const renderSidebarProfileCard = () => (
    <div className="bg-background/30 border border-cardBg/50 rounded-2xl p-4 mb-6 flex flex-col items-center text-center">
      <div className="relative w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 text-primary flex items-center justify-center font-black text-lg shadow-[0_0_12px_rgba(34,197,94,0.15)] mb-3 uppercase">
        {profile?.username ? profile.username.substring(0, 1) : 'U'}
      </div>
      <div className="w-full">
        <h4 className="text-sm font-extrabold text-textLight truncate capitalize">@{profile?.username || 'user'}</h4>
        <p className="text-[10px] text-[#8AA8B8] font-semibold mb-2">{profile?.phone || 'No Phone'}</p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            {profile?.is_active ? (
              <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></>
            ) : (
              <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></>
            )}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${profile?.is_active ? 'text-primary' : 'text-red-500'}`}>
            {profile?.is_active ? 'Active Profile' : 'Inactive'}
          </span>
        </div>
        <div className="inline-block bg-primary/5 border border-primary/15 rounded-lg px-3 py-1">
          <span className="text-[10px] font-bold text-textGray mr-1">Wallet:</span>
          <span className="text-xs font-black text-primary">৳ {formatCurrency(profile?.balance)}</span>
        </div>
      </div>
    </div>
  );  return (
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

      {/* mobile overlay */}
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

          {renderSidebarProfileCard()}

          <nav className="space-y-2">
            <button onClick={() => handleTabChange('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><LayoutDashboard className="w-5 h-5" /> Dashboard</button>
            <button onClick={() => handleTabChange('watch-ads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'watch-ads' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><Play className="w-5 h-5" /> Watch Ads</button>
            <button onClick={() => handleTabChange('withdraw')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><ArrowDownToLine className="w-5 h-5" /> Withdraw</button>
            <button onClick={() => handleTabChange('referrals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'referrals' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><Users className="w-5 h-5" /> Referrals</button>
            <button onClick={() => handleTabChange('profile-details')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile-details' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><User className="w-5 h-5" /> Profile</button>
            <button onClick={() => handleTabChange('support-page')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'support-page' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><HelpCircle className="w-5 h-5" /> Support</button>
          </nav>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-textGray hover:text-red-500 font-bold transition-colors w-full animate-none"><LogOut className="w-5 h-5" /> Sign Out</button>
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

          {renderSidebarProfileCard()}

          <nav className="space-y-2">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><LayoutDashboard className="w-5 h-5" /> Dashboard</button>
            <button onClick={() => setActiveTab('watch-ads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'watch-ads' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><Play className="w-5 h-5" /> Watch Ads</button>
            <button onClick={() => setActiveTab('withdraw')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><ArrowDownToLine className="w-5 h-5" /> Withdraw</button>
            <button onClick={() => setActiveTab('referrals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'referrals' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><Users className="w-5 h-5" /> Referrals</button>
            <button onClick={() => setActiveTab('profile-details')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile-details' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><User className="w-5 h-5" /> Profile</button>
            <button onClick={() => setActiveTab('support-page')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'support-page' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-[#8AA8B8] hover:bg-background hover:text-textLight'}`}><HelpCircle className="w-5 h-5" /> Support</button>
          </nav>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-textGray hover:text-red-500 font-bold transition-colors w-full"><LogOut className="w-5 h-5" /> Sign Out</button>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
                {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 md:space-y-8">
            
            {showAnnouncement && (
              <div className="bg-[#FBBF24]/10 border border-[#FBBF24]/30 rounded-xl px-3 py-3 sm:px-4 flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <Megaphone className="text-[#FBBF24] shrink-0" size={18} />
                  <p className="text-[#FBBF24] text-xs sm:text-sm font-medium">{activeAnnouncementText}</p>
                </div>
                <button onClick={() => setShowAnnouncement(false)} className="text-[#FBBF24]/60 hover:text-[#FBBF24] transition-colors focus:outline-none"><X size={18} /></button>
              </div>
            )}

           {/* ৩টি Top Stats Box (Today Earned, Ads Watched, Remaining) */}
            <div className="grid grid-cols-3 gap-3">
              {/* Box 1: আজকে কত টাকা আয় হলো */}
              <div className="bg-[#1A2332] border border-[#1E3A2F]/60 rounded-xl p-3 text-center">
                <span className="block text-[#8AA8B8] text-[9px] sm:text-xs font-semibold">Today Earned</span>
                <span className="block text-[#22C55E] font-black text-sm sm:text-lg mt-1">
                  ৳{formatCurrency(todayEarned)}
                </span>
              </div>

              {/* Box 2: কতটা ad দেখা হলো */}
              <div className="bg-[#1A2332] border border-[#1E3A2F]/60 rounded-xl p-3 text-center">
                <span className="block text-[#8AA8B8] text-[9px] sm:text-xs font-semibold">Ads Watched</span>
                <span className="block text-[#F0F6FF] font-black text-sm sm:text-lg mt-1">
                  {totalCompletedToday}/{activeDailyAdLimit}
                </span>
              </div>

              {/* Box 3: আর কতটা বাকি আছে */}
              <div className="bg-[#1A2332] border border-[#1E3A2F]/60 rounded-xl p-3 text-center">
                <span className="block text-[#8AA8B8] text-[9px] sm:text-xs font-semibold">Remaining</span>
                <span className="block text-[#FBBF24] font-black text-sm sm:text-lg mt-1">
                  {remainingAds === 0 ? (
                    <span className="text-[#22C55E]">Done! 🎉</span>
                  ) : (
                    `${remainingAds} left`
                  )}
                </span>
              </div>
            </div>

            {!profile.is_active && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-textLight text-sm">Account Activation Required</h4>
                    <p className="text-xs text-textGray leading-relaxed mt-1">To start watching daily ads and unlock payment withdrawal, please activate your profile.</p>
                  </div>
                </div>
                <button onClick={() => setShowActivationModal(true)} className="px-5 py-2.5 bg-red-500 text-textLight hover:bg-opacity-90 font-bold text-xs rounded-xl shadow-md transition-all shrink-0 w-full sm:w-auto">Activate Now 🔓</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-primary bg-primary/10 p-2 rounded-xl"><Landmark className="w-6 h-6" /></div>
                <h3 className="text-sm font-bold text-[#8AA8B8] mb-1">Current Balance</h3>
                <p className="text-2xl md:text-3xl font-black text-primary">৳ {formatCurrency(profile.balance)}</p>
                <button onClick={() => setActiveTab('withdraw')} className="mt-4 text-xs font-bold text-accent hover:underline flex items-center gap-1">Go to Withdraw <ArrowDownToLine className="w-3.5 h-3.5" /></button>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-accent bg-accent/10 p-2 rounded-xl"><Users className="w-6 h-6" /></div>
                <h3 className="text-sm font-bold text-[#8AA8B8] mb-1">Total Referrals</h3>
                <p className="text-2xl md:text-3xl font-black text-accent">{profile.referral_count} Users</p>
                <button onClick={() => setActiveTab('referrals')} className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1">View Referrals <Users className="w-3.5 h-3.5" /></button>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-4 top-4 text-textLight bg-textLight/10 p-2 rounded-xl"><Play className="w-6 h-6" /></div>
                <h3 className="text-sm font-bold text-[#8AA8B8] mb-1">Today's Ads completed</h3>
                <p className="text-2xl md:text-3xl font-black text-textLight">{totalCompletedToday} / {activeDailyAdLimit}/p>
                <button onClick={() => setActiveTab('watch-ads')} className="mt-4 text-xs font-bold text-accent hover:underline flex items-center gap-1">Watch Ads <Play className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-[#F0F6FF] text-sm md:text-base">Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div onClick={() => setActiveTab('watch-ads')} className="bg-[#1A2332] border border-[#1E3A2F]/60 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#22C55E]/50 hover:bg-[#1E3A2F]/30 transition-all cursor-pointer text-center min-h-[90px]">
                  <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]"><Play className="w-5 h-5 fill-[#22C55E]" /></div>
                  <span className="font-semibold text-[#F0F6FF] text-xs sm:text-sm">Watch Ads</span>
                  <span className="text-[10px] md:text-xs text-[#8AA8B8]">Earn per ad</span>
                </div>

                <div onClick={() => setActiveTab('withdraw')} className="bg-[#1A2332] border border-[#1E3A2F]/60 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#22C55E]/50 hover:bg-[#1E3A2F]/30 transition-all cursor-pointer text-center min-h-[90px]">
                  <div className="w-10 h-10 rounded-full bg-[#FBBF24]/10 flex items-center justify-center text-[#FBBF24]"><Download className="w-5 h-5" /></div>
                  <span className="font-semibold text-[#F0F6FF] text-xs sm:text-sm">Withdraw</span>
                  <span className="text-[10px] md:text-xs text-[#8AA8B8]">Cash out now</span>
                </div>

                <div onClick={() => setActiveTab('referrals')} className="bg-[#1A2332] border border-[#1E3A2F]/60 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#22C55E]/50 hover:bg-[#1E3A2F]/30 transition-all cursor-pointer text-center min-h-[90px]">
                  <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]"><Users className="w-5 h-5" /></div>
                  <span className="font-semibold text-[#F0F6FF] text-xs sm:text-sm">Refer & Earn</span>
                  <span className="text-[10px] md:text-xs text-[#8AA8B8]">Invite friends</span>
                </div>

                <div onClick={() => setActiveTab('support-page')} className="bg-[#1A2332] border border-[#1E3A2F]/60 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#22C55E]/50 hover:bg-[#1E3A2F]/30 transition-all cursor-pointer text-center min-h-[90px]">
                  <div className="w-10 h-10 rounded-full bg-[#8AA8B8]/10 flex items-center justify-center text-[#8AA8B8]"><Headphones className="w-5 h-5" /></div>
                  <span className="font-semibold text-[#F0F6FF] text-xs sm:text-sm">Support</span>
                  <span className="text-[10px] md:text-xs text-[#8AA8B8]">Get help</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[#F0F6FF] text-sm md:text-base">Available Tasks</h3>
                <button onClick={() => setActiveTab('watch-ads')} className="text-[#22C55E] hover:underline text-xs md:text-sm font-semibold flex items-center gap-0.5 focus:outline-none">See All →</button>
              </div>
              {loadingTasks ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="animate-pulse bg-[#1A2332] h-14 rounded-xl border border-[#1E3A2F]/40"></div>))}</div>
              ) : tasks.length === 0 ? (
                <div className="bg-[#1A2332] border border-[#1E3A2F]/40 p-6 rounded-2xl text-center"><p className="text-[#8AA8B8] text-xs md:text-sm font-semibold">No tasks right now. Check back soon!</p></div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="bg-[#1A2332] border border-[#1E3A2F]/60 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${task.task_type === 'watch_ad' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FBBF24]/10 text-[#FBBF24]'}`}>
                          {task.task_type === 'watch_ad' ? <Play className="w-4 h-4 fill-current" /> : <MousePointer2 className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[#F0F6FF] text-xs sm:text-sm truncate">{task.title}</h4>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] uppercase font-black tracking-wider mt-1 ${task.task_type === 'watch_ad' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#FBBF24]/10 text-[#FBBF24]'}`}>{task.task_type === 'watch_ad' ? 'Video Ad' : 'PTC'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                        <span className="text-[#FBBF24] font-black text-sm sm:text-base">৳ {formatCurrency(task.reward)}</span>
                        <button onClick={() => setActiveTab('watch-ads')} className="px-3 py-1.5 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117] font-black rounded-lg text-[10px] sm:text-xs transition-all flex items-center gap-0.5">Start →</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WATCH ADS */}
       {/* TAB 2: WATCH ADS (১টি গ্লোবাল লিংকের সম্পূর্ণ ডায়নামিক গ্রিড) */}
        {activeTab === 'watch-ads' && (
          <div className="space-y-6 md:space-y-8 max-w-4xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Ad Reward System</h1>
              <p className="text-[#8AA8B8] text-xs md:text-sm">Watch organic ads and earn {activePerAdReward}৳ per view.</p>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6">
              {!profile.is_active ? (
                // ইনঅ্যাক্টিভ ইউজারদের লকড স্ক্রিন
                <div className="bg-background rounded-2xl p-8 border border-cardBg text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto"><Lock className="w-8 h-8" /></div>
                  <h3 className="text-lg md:text-xl font-bold">Earning Feature Locked 🔒</h3>
                  <p className="text-[#8AA8B8] text-xs max-w-sm mx-auto leading-relaxed">Account activation is required to watch daily advertisements and earn real wallet rewards.</p>
                  <button onClick={() => setShowActivationModal(true)} className="mt-4 px-6 py-2.5 bg-primary text-background font-black rounded-xl text-xs hover:bg-opacity-90 shadow-lg shadow-primary/25 transition-all">Activate Account Now</button>
                </div>
              ) : (
                // অ্যাক্টিভ ইউজারদের জন্য ডাইনামিক গ্রিড কার্ড
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-bold text-[#8AA8B8]">Today's Ads limit:</span>
                    <span className="text-sm md:text-base font-black text-primary">{totalCompletedToday} / {activeDailyAdLimit} Completed</span>
                  </div>
                  <div className="w-full bg-[#0D1117] rounded-full h-3 overflow-hidden border border-cardBg mb-6">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${(totalCompletedToday / activeDailyAdLimit) * 100}%` }}></div>
                  </div>

                  {/* আপনার অ্যাডমিন প্যানেল থেকে সেট করা লিমিট অনুযায়ী অটোমেটিক কার্ড তৈরি হবে */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: activeDailyAdLimit }).map((_, index) => {
                      const adIndex = index + 1;
                      const isCompleted = adIndex <= totalCompletedToday;
                      const isActive = adIndex === totalCompletedToday + 1;
                      const isLocked = adIndex > totalCompletedToday + 1;

                      return (
                        <div 
                          key={index} 
                          className={`bg-[#0D1117] border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-300 ${isCompleted ? 'border-primary/20 opacity-60' : isActive ? 'border-primary shadow-lg shadow-primary/5 scale-[1.01]' : 'border-cardBg opacity-40'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isCompleted ? 'bg-primary/10 text-primary border-primary/25' : isActive ? 'bg-accent/10 text-accent border-accent/25' : 'bg-cardBg text-[#8AA8B8] border-cardBg'}`}>
                              {isCompleted ? 'Completed' : isActive ? 'Active Ad' : 'Locked'}
                            </span>
                            {isCompleted ? <CheckCircle className="w-4 h-4 text-primary" /> : isLocked ? <Lock className="w-4 h-4 text-[#8AA8B8]" /> : <Clock className="w-4 h-4 text-accent" />}
                          </div>

                          <div>
                            <h4 className="font-extrabold text-[#F0F6FF] text-sm">Earnova Video Ad #{adIndex}</h4>
                            <p className="text-[#8AA8B8] text-[10px] mt-1">Watch and claim your daily revenue.</p>
                          </div>

                          <div className="flex justify-between items-end border-t border-cardBg/50 pt-3">
                            <div>
                              <span className="text-[10px] text-[#8AA8B8] block">Reward</span>
                              <span className="text-sm font-black text-accent">৳ {formatCurrency(activePerAdReward)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8AA8B8] block text-right">Timer</span>
                              <span className="text-xs font-bold text-textLight">{activeAdTimer}s</span>
                            </div>
                          </div>

                          {/* বাটন কন্ট্রোল */}
                          {isCompleted ? (
                            <div className="bg-primary/10 border border-primary/20 text-primary py-2 rounded-xl text-xs font-bold text-center">
                              ✅ Earned ৳ {formatCurrency(activePerAdReward)}
                            </div>
                          ) : isLocked ? (
                            <button disabled className="w-full py-2.5 bg-cardBg text-[#8AA8B8] text-xs font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" /> Locked
                            </button>
                          ) : isWatching ? (
                            <div className="bg-[#1A2332] rounded-xl py-2 px-3 border border-accent/20 text-center">
                              <span className="text-accent font-black text-xs animate-pulse flex items-center justify-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> Ad ending in {adTimer}s
                              </span>
                            </div>
                          ) : cooldown > 0 ? (
                            <div className="bg-cardBg border border-cardBg rounded-xl py-2 text-center">
                              <span className="text-accent text-[10px] font-bold">Cooldown: {cooldown}s</span>
                            </div>
                          ) : (
                            <button 
                              onClick={startWatchingAd} 
                              className="w-full py-2.5 bg-primary text-background text-xs font-black rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-background" /> Watch Ad
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* অল টাস্ক ডান কার্ড */}
                  {totalCompletedToday >= activeDailyAdLimit && (
                    <div className="bg-[#0A1F10] border border-[#22C55E]/30 rounded-xl p-8 text-center space-y-3 mt-6">
                      <div className="text-4xl">🎉</div>
                      <h3 className="text-xl font-bold text-[#F0F6FF]">All Tasks Done for Today!</h3>
                      <p className="text-[#22C55E] font-semibold">You earned ৳{formatCurrency(totalCompletedToday * activePerAdReward)} today</p>
                      <p className="text-sm text-[#8AA8B8]">New tasks available tomorrow.<br/>Come back to earn more!</p>
                      <button onClick={() => setActiveTab('overview')} className="mt-4 px-6 py-2.5 border border-[#22C55E]/50 text-[#22C55E] rounded-xl font-bold text-sm hover:bg-[#22C55E]/10 transition-all">
                        Go to Dashboard <ArrowRight className="inline w-4 h-4 ml-1" />
                      </button>
                    </div>
                  )}
                </div>
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
              <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-8 text-center space-y-4 max-w-2xl">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto"><Lock className="w-8 h-8" /></div>
                <h3 className="text-lg md:text-xl font-bold">Withdrawals Locked 🔒</h3>
                <p className="text-[#8AA8B8] text-xs max-w-sm mx-auto leading-relaxed">Account activation is required to submit payout requests.</p>
                <button onClick={() => setShowActivationModal(true)} className="mt-4 px-6 py-2.5 bg-primary text-background font-black rounded-xl text-xs hover:bg-opacity-90 shadow-lg shadow-primary/25 transition-all">Activate Account Now</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-cardBg border border-cardBg/50 p-5 md:p-6 lg:col-span-2">
                  <form onSubmit={handleWithdraw} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-textGray mb-3">Withdraw Method</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['bkash', 'nagad', 'rocket'].map((method) => (
                          <button key={method} type="button" onClick={() => setWdMethod(method)} className={`py-4 px-2 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${wdMethod === method ? 'border-primary bg-primary/5 text-textLight shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' : 'bg-background border-cardBg text-[#8AA8B8] hover:border-textGray/30 hover:text-textLight'}`}>
                            <img src={METHOD_LOGOS[method]} alt={method} className="h-9 md:h-11 w-auto object-contain" />
                            <span className="text-[10px] md:text-xs font-bold capitalize">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Receiver Account Number</label>
                      <input type="tel" required placeholder="01XXXXXXXXX" value={wdNumber} onChange={(e) => setWdNumber(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Withdrawal Amount (৳)</label>
                      <input type="number" required placeholder="e.g. 150" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors" />
                      <div className="mt-2 text-[10px] md:text-xs text-textGray flex justify-between">
                        <span>Gateway Fee: 6.7%</span>
                        {wdAmount && <span className="text-accent font-semibold">Estimated Receive: ৳ {(Number(wdAmount) - Number(wdAmount) * 0.067).toFixed(2)}</span>}
                      </div>
                    </div>
                    <button type="submit" disabled={submittingWd} className="w-full py-4 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {submittingWd ? 'Submitting...' : 'Request Withdrawal'}
                    </button>
                  </form>
                </div>
                <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 space-y-6">
                  <h3 className="font-bold text-textLight text-sm md:text-base">Your Statistics:</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs md:text-sm border-b border-background pb-3"><span className="text-textGray">Balance:</span><span className="font-bold text-primary">৳ {formatCurrency(profile.balance)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm border-b border-background pb-3"><span className="text-textGray">Total Withdrawn:</span><span className="font-bold text-accent">৳ {formatCurrency(profile.total_withdrawn)}</span></div>
                    <div className="flex justify-between text-xs md:text-sm"><span className="text-textGray">Total Requests:</span><span className="font-bold text-textLight">{profile.withdrawals_count || 0}</span></div>
                  </div>
                  <div className="bg-background rounded-xl p-4 border border-cardBg text-xs text-textGray space-y-2">
                    <p className="font-bold text-textLight">⚠️ Withdrawal Rules:</p>
                    <p>• 1st time minimum: {activeMinWithdrawFirst}৳</p>
                    <p>• Next times minimum: {activeMinWithdrawSubsequent}৳</p>
                    <p>• Must complete 15 daily ads.</p>
                    <p>• Need 3 referrals for 2nd withdrawal.</p>
                  </div>
                </div>
              </div>
            )}

            {wdHistory.length > 0 && (
              <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6">
                <h3 className="font-bold text-textLight mb-4">Recent Withdrawals</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {wdHistory.map((wd) => (
                    <div key={wd.id} className="flex justify-between items-center bg-background p-3 rounded-xl border border-cardBg text-xs md:text-sm">
                      <div>
                        <p className="font-bold text-textLight">{wd.payment_method.toUpperCase()}</p>
                        <p className="text-textGray">{wd.payment_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">৳ {formatCurrency(wd.receive_amount)}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${wd.status === 'approved' ? 'bg-primary/10 text-primary' : wd.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-[#FBBF24]/10 text-[#FBBF24]'}`}>{wd.status || 'pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 md:space-y-8 max-w-3xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Refer & Earn</h1>
              <p className="text-textGray text-xs md:text-sm">Invite friends and get {activeReferralBonus}৳ for each active referral.</p>
            </div>
            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6 space-y-4">
              <p className="text-sm text-textGray">Share this link with your friends:</p>
              <div className="flex gap-2">
                <input readOnly value={`${window.location.origin}/register?ref=${user.id}`} className="flex-1 px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight text-xs md:text-sm truncate" />
                <button onClick={copyReferralLink} className="px-4 bg-primary text-background font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2 text-xs"><Copy className="w-4 h-4" /> Copy</button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cardBg">
                <div className="bg-background rounded-xl p-4 text-center border border-cardBg">
                  <p className="text-2xl font-black text-primary">{profile.referral_count || 0}</p>
                  <p className="text-xs text-textGray mt-1">Total Referrals</p>
                </div>
                <div className="bg-background rounded-xl p-4 text-center border border-cardBg">
                  <p className="text-2xl font-black text-accent">৳ {referralEarnings.toFixed(2)}</p>
                  <p className="text-xs text-textGray mt-1">Referral Earnings</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE DETAILS */}
        {activeTab === 'profile-details' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">My Profile</h1>
              <p className="text-textGray text-xs md:text-sm">Update your account information.</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="bg-cardBg border border-cardBg/50 rounded-2xl p-5 md:p-6 space-y-5">
              <div>
                <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Email (Cannot be changed)</label>
                <input type="email" readOnly value={user.email} className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight/50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Username</label>
                <input type="text" required value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="your_username" className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-textGray mb-2">Phone Number</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none" />
              </div>
              <button type="submit" disabled={updatingProfile} className="w-full py-3 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all">
                {updatingProfile ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: SUPPORT */}
        {activeTab === 'support-page' && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Help & Support</h1>
              <p className="text-textGray text-xs md:text-sm">Need help? Contact us through Telegram.</p>
            </div>
            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6 space-y-4">
              <a href={activeTelegramChannel} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-background rounded-xl border border-cardBg hover:border-primary/50 transition-all group">
                <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center text-[#22C55E] group-hover:scale-110 transition-transform"><Send className="w-6 h-6" /></div>
                <div><p className="font-bold text-textLight text-sm">Join Official Channel</p><p className="text-xs text-textGray">Get latest updates and news.</p></div>
              </a>
              <a href={activeTelegramAdmin} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-background rounded-xl border border-cardBg hover:border-accent/50 transition-all group">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform"><MessageSquare className="w-6 h-6" /></div>
                <div><p className="font-bold text-textLight text-sm">Contact Admin Support</p><p className="text-xs text-textGray">Direct message for account issues.</p></div>
              </a>
            </div>
          </div>
        )}

      </main>

      {/* ACTIVATION MODAL */}
      {showActivationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center relative">
            <button onClick={() => setShowActivationModal(false)} className="absolute top-4 right-4 text-textGray hover:text-red-500"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-2"><ShieldCheck className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-textLight">Activate Account</h3>
            <p className="text-sm text-textGray">Pay a one-time fee of <span className="text-primary font-bold">{activeActivationFee}৳</span> to unlock lifetime access to earnings and withdrawals.</p>
            
            <button onClick={handlePayment} disabled={paying || verifyingPayment} className="w-full py-3 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {(paying || verifyingPayment) ? 'Processing...' : `Pay ${activeActivationFee}৳ via ZiniPay`}
            </button>
            <p className="text-[10px] text-textGray">Secure payment powered by ZiniPay. Auto-activated after success.</p>
          </div>
        </div>
      )}

    </div>
  );
}
