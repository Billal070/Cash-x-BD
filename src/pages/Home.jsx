import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Users, Shield, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-textLight">
      {/* Navbar */}
      <nav className="border-b border-cardBg bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-primary flex items-center gap-1">
              🟢 Cash <span className="text-accent">x</span> BD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium bg-primary text-background rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
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
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Earn Daily Cash By Watching <span className="text-primary">Ads</span> & Doing <span className="text-accent">Tasks</span>
        </h1>
        <p className="max-w-2xl mx-auto text-textGray text-base sm:text-lg mb-8">
          Welcome to Cash x BD. The most secure micro-earning platform. Activating your account is simple, and you can withdraw directly to your bKash, Nagad, or Rocket.
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

      {/* Stats Section */}
      <section className="border-y border-cardBg bg-cardBg/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">৳ 150</div>
            <div className="text-xs sm:text-sm text-textGray font-medium">Activation Fee</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-accent mb-1">৳ 5</div>
            <div className="text-xs sm:text-sm text-textGray font-medium">Per Ad View</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">15 Ads</div>
            <div className="text-xs sm:text-sm text-textGray font-medium">Daily Limit</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-accent mb-1">৳ 30</div>
            <div className="text-xs sm:text-sm text-textGray font-medium">Per Referral</div>
          </div>
        </div>
      </section>

      {/* Rules & Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-center mb-12">Why Choose Cash x BD?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Play className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Steady Daily Work</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Complete up to 15 Ads daily. With a simple 60-second cooldown between ads, we guarantee organic and premium views to our advertising partners.
            </p>
          </div>
          {/* Card 2 */}
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Referral Multiplier</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Earn an instant ৳30 referral bonus when your referred friend successfully activates their profile with a ৳150 account setup fee.
            </p>
          </div>
          {/* Card 3 */}
          <div className="bg-cardBg border border-cardBg hover:border-primary/20 rounded-2xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Flexible Withdrawals</h3>
            <p className="text-textGray text-sm leading-relaxed">
              Cash out at just ৳75 on your first withdrawal. Subsequent minimum withdrawals are ৳200 with at least 3 active referrals to maintain our community's trust.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cardBg bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-textGray">
            &copy; {new Date().getFullYear()} Cash x BD. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs sm:text-sm text-textGray hover:text-primary">Terms</a>
            <a href="#" className="text-xs sm:text-sm text-textGray hover:text-primary">Privacy Policy</a>
            <a href="#" className="text-xs sm:text-sm text-textGray hover:text-primary">Telegram Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
