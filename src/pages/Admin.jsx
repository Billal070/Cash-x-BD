import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CONFIG as ImportedConfig } from '../config'; 
import { toast } from 'react-hot-toast';
import { 
  LayoutDashboard, Users, ArrowDownToLine, Settings, LogOut,
  Search, Check, X, Plus, ShieldAlert, Landmark, ShieldCheck,
  CheckCircle, Ban, RefreshCw, MessageSquare, Send
} from 'lucide-react';

const CONFIG = ImportedConfig || {
  siteName: "Earnova",
  logoUrl: "",
};

const formatCurrency = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

export default function Admin() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // অ্যাডমিন ড্যাশবোর্ড স্টেটসমূহ
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingWd: 0,
    totalPaid: 0
  });

  // ইউজার ম্যানেজমেন্ট স্টেটসমূহ
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null); 
  const [adjustAmount, setAdjustAmount] = useState('');

  // উইথড্রল ম্যানেজমেন্ট স্টেটসমূহ
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWd, setLoadingWd] = useState(false);
  const [wdFilter, setWdFilter] = useState('pending'); 

  // সিস্টেম সেটিংস স্টেটসমূহ
  const [settings, setSettings] = useState({
    telegram_channel: '',
    telegram_admin: '',
    adsterra_link: '',
    referral_bonus: 30,
    per_ad_reward: 5,
    activation_fee: 150,
    announcement_text: '' // ডাটাবেজ থেকে নোটিশ রিড করার জন্য যুক্ত করা হলো
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // ১. অ্যাডমিন সিকিউরিটি গেটওয়ে চেক
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // ড্যাশবোর্ড ট্যাব পরিবর্তন হলে ডাটা লোড করা
  useEffect(() => {
    if (user && profile?.is_admin) {
      if (activeTab === 'overview') fetchStats();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'withdrawals') fetchWithdrawals();
      if (activeTab === 'settings') fetchSettings();
    }
  }, [user, profile, activeTab, wdFilter]);

  // ২. ওভারভিউ স্ট্যাটস লোড করা
  const fetchStats = async () => {
    try {
      const { count: total, error: err1 } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: active, error: err2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: pending, error: err3 } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: withdrawalsData, error: err4 } = await supabase.from('withdrawals').select('amount').eq('status', 'approved');

      if (err1 || err2 || err3 || err4) throw new Error('Failed to load stats');

      const totalPaid = withdrawalsData ? withdrawalsData.reduce((sum, item) => sum + Number(item.amount), 0) : 0;

      setStats({
        totalUsers: total || 0,
        activeUsers: active || 0,
        pendingWd: pending || 0,
        totalPaid
      });
    } catch (err) {
      console.error('Stats loading failed!');
    }
  };

  // ৩. ইউজার তালিকা লোড করা ও সার্চ করা
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // ৪. ডাইনামিক স্লাইডিং টগল বাটন ফাংশন
  const toggleUserActive = async (userId, currentStatus) => {
    const toastId = toast.loading('Updating account status...');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(!currentStatus ? 'User Activated! 🟢' : 'User Deactivated! 🔴', { id: toastId });
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update status', { id: toastId });
    }
  };

  // ৫. ম্যানুয়ালি ব্যালেন্স অ্যাড/মাইনাস করার ফাংশন
  const handleAdjustBalance = async (isAdd) => {
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');

    const toastId = toast.loading('Adjusting balance...');
    const newBalance = isAdd ? Number(balanceModal.currentBalance) + amount : Number(balanceModal.currentBalance) - amount;

    if (newBalance < 0) {
      toast.error('Balance cannot be negative!', { id: toastId });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', balanceModal.userId);

      if (error) throw error;

      toast.success('Balance adjusted successfully!', { id: toastId });
      setBalanceModal(null);
      setAdjustAmount('');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to adjust balance', { id: toastId });
    }
  };

  // ৬. উইথড্রল তালিকা লোড করা (profiles:user_id দিয়ে জয়েন সুরক্ষিত করা হয়েছে)
  const fetchWithdrawals = async () => {
    setLoadingWd(true);
    setWithdrawals([]); 
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, profiles:user_id(username, email)')
        .eq('status', wdFilter) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (err) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoadingWd(false);
    }
  };

  // ৭. উইথড্রল অ্যাপ্রুভ করার ফাংশন
  const handleApproveWithdrawal = async (id) => {
    const toastId = toast.loading('Approving withdrawal...');
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Withdrawal approved successfully! 🟢', { id: toastId });
      fetchWithdrawals();
    } catch (err) {
      toast.error('Failed to approve', { id: toastId });
    }
  };

  // ৮. উইথড্রল রিজেক্ট করার ফাংশন
  const handleRejectWithdrawal = async (wd) => {
    const toastId = toast.loading('Rejecting and refunding user...');
    try {
      const { error: wdError } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', wd.id);

      if (wdError) throw wdError;

      const { data: userProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('balance, total_withdrawn, withdrawals_count')
        .eq('id', wd.user_id)
        .single();

      if (fetchError) throw fetchError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          balance: Number(userProfile.balance) + wd.amount, 
          total_withdrawn: Number(userProfile.total_withdrawn) - wd.receive_amount, 
          withdrawals_count: Number(userProfile.withdrawals_count) - 1
        })
        .eq('id', wd.user_id);

      if (profileError) throw profileError;

      toast.success('Withdrawal rejected & refunded successfully! 🔴', { id: toastId });
      fetchWithdrawals();
    } catch (err) {
      toast.error('Failed to reject withdrawal', { id: toastId });
    }
  };

  // ৯. সেটিংস লোড করা
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'config')
        .single();
      if (error) throw error;
      if (data) setSettings(data);
    } catch (err) {
      toast.error('Failed to load settings');
    }
  };

  // ১০. সেটিংস ড্যাশবোর্ড থেকে সেভ করার ফাংশন
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    const toastId = toast.loading('Saving global settings...');
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          telegram_channel: settings.telegram_channel,
          telegram_admin: settings.telegram_admin,
          adsterra_link: settings.adsterra_link,
          referral_bonus: Number(settings.referral_bonus),
          per_ad_reward: Number(settings.per_ad_reward),
          activation_fee: Number(settings.activation_fee),
          announcement_text: settings.announcement_text // নোটিশ ডাটাবেজে সেভ করার লাইন
        })
        .eq('id', 'config');

      if (error) throw error;
      toast.success('Settings updated successfully! 🟢', { id: toastId });
    } catch (err) {
      toast.error('Failed to update settings', { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textGray font-semibold">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!profile || !profile.is_admin) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-3xl font-black text-textLight">Access Denied</h1>
        <p className="text-textGray mt-2">You do not have administrative privileges to access this area.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-8 py-3 bg-primary text-background font-black rounded-xl hover:bg-opacity-90">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textLight flex flex-col md:flex-row">
      
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-cardBg border-r border-cardBg/50 flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-10 text-left">
            {CONFIG?.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG?.siteName || "Earnova"} className="h-10 w-auto mb-2 object-contain" />
            ) : (
              <span className="text-2xl font-black text-primary">🟢 {CONFIG?.siteName || "Earnova"}</span>
            )}
            <div className="mt-2 text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/25 rounded-full px-3 py-1 max-w-max">
              🛡️ Admin Terminal
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Users className="w-5 h-5" /> Manage Users
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <ArrowDownToLine className="w-5 h-5" /> Withdraw Requests
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:bg-background hover:text-textLight'}`}
            >
              <Settings className="w-5 h-5" /> Global Settings
            </button>
          </nav>
        </div>

        <button
          onClick={() => { signOut(); navigate('/'); }}
          className="flex items-center gap-3 px-4 py-3 text-textGray hover:text-red-500 font-bold transition-colors w-full"
        >
          <LogOut className="w-5 h-5" /> Logout Admin
        </button>
      </aside>

      {/* Admin Panel Main Content */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black">Admin Panel Overview</h1>
              <p className="text-textGray text-sm">Real-time statistics of {CONFIG?.siteName || "Earnova"} network.</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textGray mb-1">Total Users</h3>
                  <p className="text-3xl font-black text-textLight">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-textLight/10 text-textLight rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textGray mb-1">Active Accounts</h3>
                  <p className="text-3xl font-black text-primary">{stats.activeUsers}</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textGray mb-1">Pending Cashouts</h3>
                  <p className="text-3xl font-black text-accent">{stats.pendingWd}</p>
                </div>
                <div className="p-3 bg-accent/10 text-accent rounded-xl">
                  <ArrowDownToLine className="w-6 h-6 animate-bounce" />
                </div>
              </div>

              <div className="bg-cardBg border border-cardBg/50 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textGray mb-1">Total Paid (৳)</h3>
                  <p className="text-3xl font-black text-primary">৳ {stats.totalPaid.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Landmark className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE USERS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black">Manage Users</h1>
              <p className="text-textGray text-sm">Activate, deactivate, search users, or manually edit balances.</p>
            </div>

            {/* Search Box */}
            <div className="flex gap-4 max-w-md bg-cardBg border border-cardBg/50 p-1.5 rounded-xl">
              <input
                type="text"
                placeholder="Search username, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="flex-1 bg-transparent px-4 py-2 text-xs md:text-sm text-textLight focus:outline-none"
              />
              <button 
                onClick={fetchUsers}
                className="px-4 py-2 bg-primary text-background font-black rounded-lg text-xs flex items-center gap-1"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>

            {/* Users List Table */}
            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6">
              {loadingUsers ? (
                <div className="text-center py-6 text-textGray">Searching databases...</div>
              ) : usersList.length === 0 ? (
                <p className="text-textGray text-sm text-center py-6">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-cardBg text-textGray text-xs font-semibold">
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Email Address</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3">Balance (৳)</th>
                        <th className="pb-3">Referrals</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs md:text-sm">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="border-b border-cardBg/30">
                          <td className="py-3 font-semibold capitalize">{usr.username}</td>
                          <td className="py-3 text-textGray text-xs truncate max-w-[150px]">{usr.email}</td>
                          <td className="py-3 text-textGray font-semibold">{usr.phone || 'No Phone'}</td>
                          <td className="py-3 text-primary font-bold">৳ {formatCurrency(usr.balance)}</td>
                          <td className="py-3 font-medium text-accent">{usr.referral_count} Users</td>
                          <td className="py-3">
                            {/* iOS-style প্রফেশনাল স্লাইডিং টগল বাটন */}
                            <button
                              onClick={() => toggleUserActive(usr.id, usr.is_active)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                usr.is_active ? 'bg-primary' : 'bg-red-500/30'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-textLight shadow ring-0 transition duration-200 ease-in-out ${
                                  usr.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setBalanceModal({ userId: usr.id, username: usr.username, currentBalance: usr.balance })}
                              className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent hover:text-background rounded-lg text-xs font-bold transition-all"
                            >
                              Adjust Balance
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Manual Balance Adjust Modal */}
            {balanceModal && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="max-w-md w-full bg-cardBg border border-cardBg/50 p-6 rounded-2xl relative">
                  <button 
                    onClick={() => setBalanceModal(null)}
                    className="absolute right-4 top-4 text-textGray hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold mb-1">Adjust Balance</h3>
                  <p className="text-textGray text-xs mb-6">Modifying balance for: <strong className="text-primary capitalize">{balanceModal.username}</strong> (Current: ৳ {formatCurrency(balanceModal.currentBalance)})</p>

                  <div className="space-y-4">
                    <input
                      type="number"
                      required
                      placeholder="Enter amount (৳)"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-textLight focus:border-primary focus:outline-none transition-colors"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleAdjustBalance(true)}
                        className="py-3 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/15"
                      >
                        <Plus className="w-4 h-4" /> Add Balance
                      </button>
                      <button
                        onClick={() => handleAdjustBalance(false)}
                        className="py-3 bg-red-500 text-textLight font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-red-500/15"
                      >
                        <X className="w-4 h-4" /> Subtract Balance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WITHDRAW REQUESTS */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black">Withdrawal Requests</h1>
                <p className="text-textGray text-sm">Approve cashout requests or reject them to refund users instantly.</p>
              </div>

              {/* Status Filter buttons */}
              <div className="flex bg-cardBg border border-cardBg/50 p-1.5 rounded-xl max-w-max">
                {['pending', 'approved', 'rejected'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setWdFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${wdFilter === filter ? 'bg-primary text-background shadow-lg shadow-primary/10' : 'text-textGray hover:text-textLight'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawals List Table */}
            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6">
              {loadingWd ? (
                <div className="text-center py-6 text-textGray">Loading withdrawals...</div>
              ) : withdrawals.length === 0 ? (
                <p className="text-textGray text-sm text-center py-6">No {wdFilter} withdrawal requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-cardBg text-textGray text-xs font-semibold">
                        <th className="pb-3">User</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Fee (6.7%)</th>
                        <th className="pb-3">To Receive</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Payment Number</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs md:text-sm">
                      {withdrawals.map((wd) => (
                        <tr key={wd.id} className="border-b border-cardBg/30">
                          <td className="py-3">
                            <div className="font-semibold capitalize">{wd.profiles?.username || 'user'}</div>
                            <span className="text-[10px] text-textGray block mt-0.5">{wd.profiles?.email}</span>
                          </td>
                          <td className="py-3 font-bold">৳ {wd.amount}</td>
                          <td className="py-3 text-red-500">৳ {wd.fee}</td>
                          <td className="py-3 text-primary font-bold">৳ {wd.receive_amount}</td>
                          <td className="py-3 capitalize font-semibold">{wd.payment_method}</td>
                          <td className="py-3 font-semibold text-textGray">{wd.payment_number}</td>
                          <td className="py-3 text-right">
                            {wd.status === 'pending' ? (
                              <div className="space-x-2">
                                <button
                                  onClick={() => handleApproveWithdrawal(wd.id)}
                                  className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-background rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all"
                                  title="Approve & Mark Paid"
                                >
                                  <Check className="w-4 h-4" /> Approve
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(wd)}
                                  className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-textLight rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all"
                                  title="Reject & Refund user"
                                >
                                  <X className="w-4 h-4" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${wd.status === 'approved' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {wd.status}
                              </span>
                            )}
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

        {/* TAB 4: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h1 className="text-3xl font-black">Global System Settings</h1>
              <p className="text-textGray text-sm">Edit payment links, fees, and referral parameters on the fly.</p>
            </div>

            <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Activation fee & rewards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Activation Fee (৳)</label>
                    <input
                      type="number"
                      required
                      value={settings.activation_fee}
                      onChange={(e) => setSettings({ ...settings, activation_fee: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Per Ad Reward (৳)</label>
                    <input
                      type="number"
                      required
                      value={settings.per_ad_reward}
                      onChange={(e) => setSettings({ ...settings, per_ad_reward: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Referral Bonus (৳)</label>
                    <input
                      type="number"
                      required
                      value={settings.referral_bonus}
                      onChange={(e) => setSettings({ ...settings, referral_bonus: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

         {/* Telegram & Ads links */}
                <div className="space-y-4">
                  {/* Live Announcement Input (নোটিশ লেখার কাস্টম বক্স) */}
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Live Announcement / Notice Text</label>
                    <textarea
                      required
                      value={settings.announcement_text}
                      onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-[#0D1117] border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Official Telegram Channel URL</label>
                    <input
                      type="url"
                      required
                      value={settings.telegram_channel}
                      onChange={(e) => setSettings({ ...settings, telegram_channel: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Support Admin Telegram URL</label>
                    <input
                      type="url"
                      required
                      value={settings.telegram_admin}
                      onChange={(e) => setSettings({ ...settings, telegram_admin: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textGray mb-2">Adsterra Direct Ad Link</label>
                    <input
                      type="url"
                      required
                      value={settings.adsterra_link}
                      onChange={(e) => setSettings({ ...settings, adsterra_link: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-cardBg rounded-xl text-xs text-textLight focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="py-3 px-8 bg-primary text-background font-black rounded-xl hover:bg-opacity-90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Global Settings'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
