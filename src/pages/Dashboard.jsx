import React from 'react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto bg-cardBg rounded-2xl p-8 border border-cardBg/50">
        <h1 className="text-3xl font-extrabold mb-4">User Dashboard</h1>
        <p className="text-textGray mb-6">Welcome to your Cash x BD dashboard. Database setup is ongoing.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-background rounded-xl border border-cardBg">
            <h3 className="text-sm font-semibold text-textGray mb-1">Balance</h3>
            <p className="text-2xl font-bold text-primary">৳ 0.00</p>
          </div>
          <div className="p-6 bg-background rounded-xl border border-cardBg">
            <h3 className="text-sm font-semibold text-textGray mb-1">Referrals</h3>
            <p className="text-2xl font-bold text-accent">0 Users</p>
          </div>
          <div className="p-6 bg-background rounded-xl border border-cardBg">
            <h3 className="text-sm font-semibold text-textGray mb-1">Tasks Done</h3>
            <p className="text-2xl font-bold text-textLight">0/15</p>
          </div>
        </div>
      </div>
    </div>
  );
}
