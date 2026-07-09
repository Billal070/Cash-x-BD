import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Users, Shield, CheckCircle, Landmark, Star } from 'lucide-react';
import { CONFIG } from '../config'; 

// হাই-পারফরম্যান্স কাউন্ট-আপ কম্পোনেন্ট (Native requestAnimationFrame)
function CountUp({ end, prefix = "", suffix = "", duration = 2000, trigger }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime = null;
    const cleanEnd = typeof end === 'string' ? parseFloat(end.replace(/[^0-9.]/g, '')) : end;
    const isDecimal = String(end).includes('.');

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      let currentVal = progress * cleanEnd;
      if (isDecimal) {
        setCount(currentVal.toFixed(1));
      } else {
        setCount(Math.floor(currentVal).toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, trigger]);

  return <span>{prefix}{count}{suffix}</span>;
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const statsSectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); 
        }
      },
      { threshold: 0.15 }
    );

    if (statsSectionRef.current) {
      observer.observe(statsSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-textLight">
      {/* Navbar */}
      <nav className="border-b border-cardBg bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {CONFIG.logoUrl ? (
              <img src={CONFIG.logoUrl} alt={CONFIG.siteName} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-2xl font-extrabold text-primary flex items-center gap-1">
                🟢 {CONFIG.siteName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2.5 text-sm font-medium bg-primary text-background rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
              Register Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Trusted Reward Platform in Bangladesh
        </div>
        <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Earn Daily Cash By Watching <span className="text-primary">Ads</span> & Doing <span className="text-accent">Tasks</span>
        </h1>
        <p className="max-w-2xl mx-auto text-textGray text-sm sm:text-lg mb-8">
          Welcome to {CONFIG.siteName}. The most secure micro-earning platform. Activating your account is simple, and you can withdraw directly to your bKash, Nagad, or Rocket.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-background font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-xl shadow-primary/25">
            Start Earning Now <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="flex items-center justify-center gap-2 px-8 py-4 border border-cardBg bg-cardBg/50 font-semibold rounded-xl hover:bg-cardBg transition-all">
            Access Dashboard
          </Link>
        </div>
      </header>

      {/* NEW SECTION 1: Premium Live Statistics (হিরো সেকশনের ঠিক নিচে নিয়ে আসা হয়েছে) */}
      <section 
        ref={statsSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cardBg bg-cardBg/10 overflow-hidden"
      >
        <div className={`text-center transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">
            Trusted by Thousands of Earners
          </h2>
          <p className="max-w-2xl mx-auto text-textGray text-sm sm:text-base mb-16 leading-relaxed">
            Join a growing community earning real rewards every day through simple online tasks with {CONFIG.siteName}.
          </p>
        </div>

        {/* Responsive Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Card 1 */}
          <div 
            className={`group bg-cardBg border border-cardBg/50 hover:border-primary/30 rounded-[22px] p-6 shadow-xl transition-all duration-300 ease-in-out md:hover:-translate-y-1.5 md:hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(34,197,94,0.12)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-textGray mb-1">Registered Users</h4>
            <p className="text-3xl font-black text-textLight">
              <CountUp end="25000" suffix="+" trigger={isVisible} />
            </p>
            <p className="text-xs text-textGray mt-2 font-medium">Active Members</p>
          </div>

          {/* Card 2 */}
          <div 
            className={`group bg-cardBg border border-cardBg/50 hover:border-primary/30 rounded-[22px] p-6 shadow-xl transition-all duration-300 ease-in-out md:hover:-translate-y-1.5 md:hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(34,197,94,0.12)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: isVisible ? '250ms' : '0ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-textGray mb-1">Total Paid</h4>
            <p className="text-3xl font-black text-accent">
              <CountUp end="3580000" prefix="৳" suffix="+" trigger={isVisible} />
            </p>
            <p className="text-xs text-textGray mt-2 font-medium">Successfully Withdrawn</p>
          </div>

          {/* Card 3 */}
          <div 
            className={`group bg-cardBg border border-cardBg/50 hover:border-primary/30 rounded-[22px] p-6 shadow-xl transition-all duration-300 ease-in-out md:hover:-translate-y-1.5 md:hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(34,197,94,0.12)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-textGray mb-1">Tasks Completed</h4>
            <p className="text-3xl font-black text-textLight">
              <CountUp end="1250000" suffix="+" trigger={isVisible} />
            </p>
            <p className="text-xs text-textGray mt-2 font-medium">Completed Successfully</p>
          </div>

          {/* Card 4 */}
          <div 
            className={`group bg-cardBg border border-cardBg/50 hover:border-primary/30 rounded-[22px] p-6 shadow-xl transition-all duration-300 ease-in-out md:hover:-translate-y-1.5 md:hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(34,197,94,0.12)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: isVisible ? '550ms' : '0ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
              <Star className="w-6 h-6 fill-accent" />
            </div>
            <h4 className="text-sm font-bold text-textGray mb-1">Trust Rating</h4>
            <p className="text-3xl font-black text-accent">
              <CountUp end="4.9" suffix="/5" trigger={isVisible} />
            </p>
            <p className="text-xs text-textGray mt-2 font-medium">User Satisfaction</p>
          </div>

        </div>
      </section>

      {/* SECTION 2: Why Choose Section (ফিচার গ্রিড) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-cardBg/50">
        <h2 className="text-3xl font-extrabold text-center mb-12">Why Choose {CONFIG.siteName}?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Play className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Steady Daily Work</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Complete up to 15 Ads daily. With a simple 60-second cooldown between ads, we guarantee organic and premium views to our advertising partners.
            </p>
          </div>
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Referral Multiplier</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Earn an instant ৳{CONFIG.referralBonus} referral bonus when your referred friend successfully activates their profile with a ৳{CONFIG.activationFee} account setup fee.
            </p>
          </div>
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Flexible Withdrawals</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Cash out at just ৳{CONFIG.minWithdrawFirst} on your first withdrawal. Subsequent minimum withdrawals are ৳{CONFIG.minWithdrawSubsequent} with at least 3 active referrals.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cardBg bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-textGray">
            &copy; {new Date().getFullYear()} {CONFIG.siteName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs sm:text-sm text-textGray hover:text-primary">Terms</a>
            <a href="#" className="text-xs sm:text-sm text-textGray hover:text-primary">Privacy Policy</a>
            <a href={CONFIG.telegramLink} target="_blank" rel="noreferrer" className="text-xs sm:text-sm text-textGray hover:text-primary">Telegram Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
