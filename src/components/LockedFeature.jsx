import { Lock } from 'lucide-react';

export default function LockedFeature({ title, description, onActivate }) {
  return (
    <div className="bg-cardBg border border-cardBg/50 rounded-2xl p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8" />
      </div>
      <h3 className="text-lg md:text-xl font-bold">{title}</h3>
      <p className="text-[#8AA8B8] text-xs max-w-sm mx-auto leading-relaxed">{description}</p>
      <button
        onClick={onActivate}
        className="mt-4 px-6 py-2.5 bg-primary text-background font-black rounded-xl text-xs hover:bg-opacity-90 shadow-lg shadow-primary/25 transition-all"
      >
        Activate Account Now
      </button>
    </div>
  );
}
