import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Sparkles, CheckCircle, Clock, Zap, Crown, Star, Shield, Award, Gem, Trophy, Eye } from 'lucide-react';

const tierConfig = {
  starter:  { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E' },
  basic:    { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E', popular: true },
  silver:   { iconColor: '#FBBF24', btnBg: 'bg-[#FBBF24]', borderHover: '#FBBF24' },
  gold:     { iconColor: '#FBBF24', btnBg: 'bg-[#FBBF24]', borderHover: '#FBBF24' },
  platinum: { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E' },
  elite:    { iconColor: '#a78bfa', btnBg: 'bg-[#a78bfa]', borderHover: '#a78bfa' },
  master:   { iconColor: '#a78bfa', btnBg: 'bg-[#a78bfa]', borderHover: '#a78bfa' },
  vip:      { iconColor: '#f472b6', btnBg: 'bg-[#f472b6]', borderHover: '#f472b6' },
};

const tierIcons = {
  starter: Zap, basic: Star, silver: Shield, gold: Award,
  platinum: Gem, elite: Crown, master: Trophy, vip: Sparkles,
};

export default function BonusPackages({ refreshProfile }) {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [activePackage, setActivePackage] = useState(null);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [loading, setLoading] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [bonusTimer, setBonusTimer] = useState(0);
  const [bonusStarted, setBonusStarted] = useState(false);
  const [showClaimBtn, setShowClaimBtn] = useState(false);
  const [bonusAdUrl, setBonusAdUrl] = useState('');
  const [totalBonusEarned, setTotalBonusEarned] = useState(0);
  const [todayBonusEarned, setTodayBonusEarned] = useState(0);
  const [resetsIn, setResetsIn] = useState('--:--:--');

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    let interval;
    if (bonusStarted && bonusTimer > 0) {
      interval = setInterval(() => setBonusTimer((p) => p - 1), 1000);
    } else if (bonusStarted && bonusTimer === 0) {
      setBonusStarted(false);
      setShowClaimBtn(true);
    }
    return () => clearInterval(interval);
  }, [bonusStarted, bonusTimer]);

  useEffect(() => {
    const updateReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setResetsIn(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    updateReset();
    const timer = setInterval(updateReset, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [pkgsRes, activeRes, completionRes, tasksRes, todayRes, totalRes] = await Promise.all([
      supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_packages').select('*, packages(*)').eq('user_id', user.id).eq('is_active', true).gte('expires_at', new Date().toISOString()).maybeSingle(),
      supabase.from('bonus_completions').select('id').eq('user_id', user.id).gte('completed_at', today).maybeSingle(),
      supabase.from('tasks').select('ad_url').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('bonus_completions').select('reward_earned').eq('user_id', user.id).gte('completed_at', today),
      supabase.from('bonus_completions').select('reward_earned').eq('user_id', user.id)
    ]);

    setPackages(pkgsRes.data || []);
    setActivePackage(activeRes.data || null);
    setTodayClaimed(!!completionRes.data);
    setBonusAdUrl(tasksRes.data?.ad_url || '');

    const todayTotal = (todayRes.data || []).reduce((sum, c) => sum + (c.reward_earned || 0), 0);
    const allTotal = (totalRes.data || []).reduce((sum, c) => sum + (c.reward_earned || 0), 0);
    setTodayBonusEarned(todayTotal);
    setTotalBonusEarned(allTotal);
  };

  const getDaysInfo = () => {
    if (!activePackage) return { used: 0, left: 0 };
    const purchased = new Date(activePackage.purchased_at);
    const now = new Date();
    const expires = new Date(activePackage.expires_at);
    const used = Math.min(Math.floor((now - purchased) / 86400000), 30);
    const left = Math.max(Math.ceil((expires - now) / 86400000), 0);
    return { used, left };
  };

  const handleBuyPackage = async (pkg) => {
    setLoading(pkg.id);
    try {
      const invoiceResponse = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, username: user.user_metadata?.username || 'User', amount: pkg.price, redirectUrl: `${window.location.origin}/dashboard`, type: 'bonus_package', packageId: pkg.id })
      });
      const invoiceData = await invoiceResponse.json();
      if (!invoiceResponse.ok) throw new Error(invoiceData.error || 'Payment failed');

      const invoiceUrl = invoiceData.payment_url;
      if (invoiceUrl) {
        window.location.href = invoiceUrl;
      } else {
        toast.success('Package activated!');
        await fetchData();
        if (refreshProfile) await refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed.');
    } finally {
      setLoading(null);
    }
  };

  const handleBonusWatch = () => {
    if (!activePackage) return;
    window.open(bonusAdUrl || 'https://www.effectivegatecpm.com/j430o3gxy?key=45bfab9e5c9c8c7e57e4b5e0e5d0b5a0', '_blank');
    setBonusTimer(30);
    setBonusStarted(true);
    setShowClaimBtn(false);
    toast.success('Ad loaded! Wait 30 seconds to claim reward.');
  };

  const handleBonusClaim = async () => {
    if (!activePackage) return;
    setClaiming(true);
    const reward = activePackage.packages.daily_reward;
    const toastId = toast.loading(`Claiming ৳${reward} bonus...`);
    try {
      const { error: insertError } = await supabase.from('bonus_completions').insert({ user_id: user.id, user_package_id: activePackage.id, reward_earned: reward, completed_at: new Date().toISOString() });
      if (insertError) throw insertError;
      await supabase.rpc('increment_profile_balance', { p_user_id: user.id, p_amount: reward });
      const { error: logError } = await supabase.from('earnings_log').insert({ user_id: user.id, amount: reward, source: 'bonus_package', source_id: String(activePackage.id) });
      if (logError) console.error('earnings_log insert failed:', logError.message);
      toast.success(`৳${reward} bonus credited!`, { id: toastId });
      setTodayClaimed(true);
      setShowClaimBtn(false);
      await fetchData();
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      toast.error('Failed to claim bonus', { id: toastId });
    } finally {
      setClaiming(false);
    }
  };

  const { used: daysUsed, left: daysLeft } = getDaysInfo();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-widest mb-1">Bonus Packages</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#F0F6FF]">Unlock Extra Daily Earnings</h1>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#162030] border border-[#1E3A2F] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-wider mb-1">Active Tier</p>
          <p className="text-lg font-black text-[#22C55E]">{activePackage?.packages?.name || 'None'}</p>
          {activePackage && <p className="text-[10px] text-[#8AA8B8] mt-0.5">{daysLeft} days left</p>}
        </div>
        <div className="bg-[#162030] border border-[#1E3A2F] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-wider mb-1">Today's Bonus</p>
          <p className="text-lg font-black text-[#FBBF24]">৳{todayBonusEarned.toFixed(2)}</p>
          <p className="text-[10px] text-[#22C55E] mt-0.5">Resets in {resetsIn}</p>
        </div>
        <div className="bg-[#162030] border border-[#1E3A2F] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-wider mb-1">Total Bonus</p>
          <p className="text-lg font-black text-[#22C55E]">৳{totalBonusEarned.toFixed(2)}</p>
          <p className="text-[10px] text-[#8AA8B8] mt-0.5">From packages</p>
        </div>
      </div>

      {/* Active Package Card */}
      {activePackage && (
        <div className="bg-[#0A1F10] border border-[#22C55E]/30 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F0F6FF]">{activePackage.packages?.name} Package</h3>
                <span className="px-2 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold rounded-full">Active</span>
              </div>
              <p className="text-xs text-[#8AA8B8] mt-1">Daily reward: <span className="text-[#FBBF24] font-bold">৳{activePackage.packages?.daily_reward}</span> • Resets every 24 hours</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8AA8B8]">Expires</p>
              <p className="text-lg font-black text-[#F0F6FF]">{daysLeft} <span className="text-xs font-semibold text-[#8AA8B8]">days</span></p>
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full bg-[#0D1117] rounded-full h-2 overflow-hidden">
              <div className="bg-[#22C55E] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((daysUsed / 30) * 100, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-[#8AA8B8] mt-1.5">{daysUsed} of 30 days used</p>
          </div>

          {!todayClaimed ? (
            bonusTimer > 0 ? (
              <div className="w-full py-3.5 bg-[#1E3A2F] border border-[#22C55E]/30 rounded-xl text-[#22C55E] text-sm font-bold text-center flex items-center justify-center gap-2 min-h-[48px]">
                <Clock className="w-4 h-4 animate-spin" /> Wait {bonusTimer}s to claim...
              </div>
            ) : showClaimBtn ? (
              <button
                onClick={handleBonusClaim}
                disabled={claiming}
                className="w-full py-3.5 bg-[#FBBF24] text-[#0D1117] font-black rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all text-sm min-h-[48px] flex items-center justify-center gap-2"
              >
                {claiming ? 'Claiming...' : `Claim ৳${activePackage.packages.daily_reward}`}
              </button>
            ) : (
              <button
                onClick={handleBonusWatch}
                className="w-full py-3.5 bg-[#22C55E] text-[#0D1117] font-black rounded-xl hover:bg-opacity-90 transition-all text-sm min-h-[48px] flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Watch Bonus Ad to Earn ৳{activePackage.packages?.daily_reward}
              </button>
            )
          ) : (
            <div className="space-y-1.5">
              <button disabled className="w-full py-3.5 bg-[#1E3A2F] text-[#8AA8B8] rounded-xl text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]">
                <CheckCircle className="w-4 h-4" /> Reward claimed today ✓
              </button>
              <p className="text-[10px] text-[#8AA8B8] text-center">Come back tomorrow</p>
            </div>
          )}
        </div>
      )}

      {/* Available Packages */}
      <div>
        <h3 className="text-sm font-bold text-[#F0F6FF] mb-4">Available Packages</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const style = tierConfig[pkg.tier] || tierConfig.starter;
            const Icon = tierIcons[pkg.tier] || Sparkles;
            const isActive = activePackage?.package_id === pkg.id;
            const hasActive = !!activePackage;

            return (
              <div
                key={pkg.id}
                className="bg-[#162030] border border-[#1E3A2F] rounded-2xl p-4 flex flex-col items-center text-center transition-all relative"
                style={{ borderColor: `${style.borderHover}30` }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${style.borderHover}70`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = `${style.borderHover}30`}
              >
                {style.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#162030] border border-[#22C55E]/50 rounded-full z-10">
                    <span className="text-[9px] font-black text-[#22C55E] uppercase tracking-wider">Popular</span>
                  </div>
                )}

                <div className="w-14 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${style.iconColor}10` }}>
                  <Icon className="w-5 h-5" style={{ color: style.iconColor }} />
                </div>

                <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-wider">{pkg.tier}</p>
                <p className="text-2xl font-black mt-1" style={{ color: style.iconColor }}>৳{pkg.price}</p>

                <div className="w-full border-t border-[#1E3A2F] my-3"></div>

                <div className="w-full space-y-1 mb-4">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8AA8B8]">Daily</span>
                    <span className="text-[#FBBF24] font-semibold">৳{pkg.daily_reward}/day</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8AA8B8]">30 days</span>
                    <span className="font-semibold" style={{ color: style.iconColor }}>৳{pkg.daily_reward * 30}</span>
                  </div>
                </div>

                {isActive ? (
                  <div className="w-full py-2.5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-[#22C55E] text-xs font-bold min-h-[40px] flex items-center justify-center">
                    Active
                  </div>
                ) : hasActive ? (
                  <button
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loading === pkg.id}
                    className="w-full py-2.5 rounded-xl text-xs font-bold min-h-[40px] transition-all disabled:opacity-50"
                    style={{ backgroundColor: `${style.iconColor}15`, color: style.iconColor, border: `1px solid ${style.iconColor}30` }}
                  >
                    {loading === pkg.id ? '...' : 'Upgrade'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loading === pkg.id}
                    className="w-full py-2.5 text-[#0D1117] rounded-xl text-xs font-black hover:bg-opacity-90 transition-all min-h-[40px]"
                    style={{ backgroundColor: style.iconColor }}
                  >
                    {loading === pkg.id ? '...' : 'Buy'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
