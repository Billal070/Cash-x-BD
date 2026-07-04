import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Sparkles, Info, CheckCircle, Clock, Zap, Crown, Star, Shield, Award, Gem, Trophy, Eye } from 'lucide-react';

const tierConfig = {
  starter:  { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E' },
  basic:    { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E', popular: true },
  silver:   { iconColor: '#FBBF24', btnBg: 'bg-[#FBBF24]', borderHover: '#FBBF24' },
  gold:     { iconColor: '#FBBF24', btnBg: 'bg-[#FBBF24]', borderHover: '#FBBF24' },
  platinum: { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E' },
  elite:    { iconColor: '#22C55E', btnBg: 'bg-[#22C55E]', borderHover: '#22C55E' },
  master:   { iconColor: '#a78bfa', btnBg: 'bg-[#a78bfa]', borderHover: '#a78bfa' },
  vip:      { iconColor: '#a78bfa', btnBg: 'bg-[#a78bfa]', borderHover: '#a78bfa' },
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
  const [hoveredTier, setHoveredTier] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

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

  const fetchData = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [pkgsRes, activeRes, completionRes, tasksRes] = await Promise.all([
      supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_packages').select('*, packages(*)').eq('user_id', user.id).eq('is_active', true).gte('expires_at', new Date().toISOString()).single(),
      supabase.from('bonus_completions').select('id').eq('user_id', user.id).gte('completed_at', today).single(),
      supabase.from('tasks').select('ad_url').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
    ]);

    setPackages(pkgsRes.data || []);
    setActivePackage(activeRes.data || null);
    setTodayClaimed(!!completionRes.data);
    setBonusAdUrl(tasksRes.data?.ad_url || '');
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
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          username: user.user_metadata?.username || 'User',
          amount: pkg.price,
          redirectUrl: `${window.location.origin}/dashboard`,
        })
      });

      const invoiceData = await invoiceResponse.json();
      if (!invoiceResponse.ok) throw new Error(invoiceData.error || 'Payment failed');

      const invoiceId = invoiceData.invoice_id || invoiceData.id;

      const verifyResponse = await fetch('/api/verify-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, userId: user.id, packageId: pkg.id })
      });

      const verifyData = await verifyResponse.json();

      if (invoiceData.invoice_url || invoiceData.url) {
        window.location.href = invoiceData.invoice_url || invoiceData.url;
      } else if (verifyData.success) {
        toast.success('Package activated!');
        await fetchData();
        if (refreshProfile) await refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed. Try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleBonusWatch = () => {
    if (!activePackage) return;
    const url = bonusAdUrl || 'https://www.effectivegatecpm.com/j430o3gxy?key=45bfab9e5c9c8c7e57e4b5e0e5d0b5a0';
    window.open(url, '_blank');
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
      const { error: insertError } = await supabase.from('bonus_completions').insert({
        user_id: user.id,
        user_package_id: activePackage.id,
        reward_earned: reward,
        completed_at: new Date().toISOString()
      });
      if (insertError) throw insertError;

      const { data: currentProfile } = await supabase.from('profiles').select('balance, total_earned, today_earned').eq('id', user.id).single();

      if (currentProfile) {
        await supabase.from('profiles').update({
          balance: (currentProfile.balance || 0) + reward,
          total_earned: (currentProfile.total_earned || 0) + reward,
          today_earned: (currentProfile.today_earned || 0) + reward
        }).eq('id', user.id);
      }

      toast.success(`৳${reward} bonus credited!`, { id: toastId });
      setTodayClaimed(true);
      setShowClaimBtn(false);
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      toast.error('Failed to claim bonus', { id: toastId });
    } finally {
      setClaiming(false);
    }
  };

  const { used: daysUsed, left: daysLeft } = getDaysInfo();

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-[#FBBF24]" /> Bonus Packages
        </h1>
        <p className="text-[#8AA8B8] text-xs md:text-sm">Buy a package to unlock extra daily ads</p>
      </div>

      {/* Info Bar */}
      <div className="bg-[#1A2332] border border-[#1E3A2F] rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
        <p className="text-xs text-[#8AA8B8] leading-relaxed">
          Buy a package → Extra ads unlock daily → Watch ads → Earn BDT → Valid for 30 days
        </p>
      </div>

      {/* Active Package Card */}
      {activePackage && (
        <div className="bg-[#0A1F10] border border-[#22C55E]/30 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F0F6FF]">{activePackage.packages?.name || 'Package'}</h3>
              <span className="px-2 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold rounded-full uppercase">Active</span>
            </div>
            <span className="text-[#FBBF24] text-sm font-bold">৳{activePackage.packages?.daily_reward || 0}/day</span>
          </div>

          <div className="mb-4">
            <div className="w-full bg-[#0D1117] rounded-full h-2.5 overflow-hidden border border-[#1E3A2F]">
              <div
                className="bg-gradient-to-r from-[#22C55E] to-[#FBBF24] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((daysUsed / 30) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-[#8AA8B8] mt-1.5 text-center">
              {daysUsed} of 30 days used • {daysLeft} days remaining
            </p>
          </div>

          {!todayClaimed ? (
            bonusTimer > 0 ? (
              <div className="space-y-3">
                <div className="w-full py-3 bg-[#1E3A2F] border border-[#22C55E]/30 rounded-xl text-[#22C55E] text-sm font-bold text-center flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" /> Wait {bonusTimer}s to claim...
                </div>
              </div>
            ) : showClaimBtn ? (
              <button
                onClick={handleBonusClaim}
                disabled={claiming}
                className="w-full py-3 bg-[#FBBF24] text-[#0D1117] font-black rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
              >
                {claiming ? 'Claiming...' : `Claim ৳${activePackage.packages.daily_reward}`}
              </button>
            ) : (
              <button
                onClick={handleBonusWatch}
                className="w-full py-3 bg-[#22C55E] text-[#0D1117] font-black rounded-xl hover:bg-opacity-90 transition-all text-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Eye className="w-4 h-4" /> Watch Bonus Ad
              </button>
            )
          ) : (
            <div className="space-y-2">
              <button
                disabled
                className="w-full py-3 bg-[#1E3A2F] text-[#8AA8B8] rounded-xl text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" /> Reward claimed today ✓
              </button>
              <p className="text-[10px] text-[#8AA8B8] text-center">Come back tomorrow</p>
            </div>
          )}
        </div>
      )}

      {/* Packages Grid */}
      <div>
        <h3 className="text-sm font-bold text-[#F0F6FF] mb-4">Available Packages</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const style = tierConfig[pkg.tier] || tierConfig.starter;
            const Icon = tierIcons[pkg.tier] || Sparkles;
            const isActive = activePackage?.package_id === pkg.id;
            const hasActive = !!activePackage;
            const isHovered = hoveredTier === pkg.tier;

            return (
              <div
                key={pkg.id}
                onMouseEnter={() => setHoveredTier(pkg.tier)}
                onMouseLeave={() => setHoveredTier(null)}
                className={`bg-[#162030] border rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-200 ${
                  isActive ? 'ring-1 ring-[#22C55E]/40' : ''
                }`}
                style={{ borderColor: isHovered ? `${style.borderHover}80` : `${style.borderHover}30` }}
              >
                {/* Popular Badge */}
                {style.popular && (
                  <span className="mb-2 px-2.5 py-0.5 bg-[#FBBF24]/15 border border-[#FBBF24]/30 text-[#FBBF24] text-[9px] font-black rounded-full uppercase tracking-wider">
                    Popular
                  </span>
                )}

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${style.iconColor}15`, border: `1px solid ${style.iconColor}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: style.iconColor }} />
                </div>

                {/* Tier Name */}
                <p className="text-[10px] font-bold text-[#8AA8B8] uppercase tracking-wider mb-1">{pkg.tier}</p>

                {/* Price */}
                <p className="text-3xl font-black mb-3" style={{ color: style.iconColor }}>৳{pkg.price}</p>

                {/* Divider */}
                <div className="w-full border-t border-[#1E3A2F] mb-3"></div>

                {/* Details */}
                <div className="space-y-1.5 w-full mb-4">
                  <p className="text-[10px] text-[#FBBF24] font-semibold">Daily: ৳{pkg.daily_reward}/day</p>
                  <p className="text-[10px] font-semibold" style={{ color: style.iconColor }}>Total: ৳{pkg.daily_reward * 30}</p>
                  <p className="text-[10px] text-[#8AA8B8]">Validity: 30 days</p>
                </div>

                {/* Button */}
                {isActive ? (
                  <div className="w-full py-2.5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-[#22C55E] text-xs font-bold text-center min-h-[44px] flex items-center justify-center">
                    Active
                  </div>
                ) : hasActive ? (
                  <button
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loading === pkg.id}
                    className="w-full py-2.5 border border-[#FBBF24]/30 text-[#FBBF24] rounded-xl text-xs font-bold hover:bg-[#FBBF24]/10 transition-all disabled:opacity-50 min-h-[44px]"
                  >
                    {loading === pkg.id ? 'Processing...' : 'Upgrade'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loading === pkg.id}
                    className="w-full py-2.5 text-[#0D1117] rounded-xl text-xs font-black hover:bg-opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
                    style={{ backgroundColor: style.iconColor }}
                  >
                    {loading === pkg.id ? 'Processing...' : 'Buy'}
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
