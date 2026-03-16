import { Shield } from 'lucide-react';

export function GlobalLoadingScreen() {
  return (
    <div className="fixed inset-0 h-screen w-screen bg-gradient-to-br from-[#060D1F] via-[#0f1629] to-[#1a0f2e] flex items-center justify-center z-[9999]">
      {/* Background gradient orbs for premium effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content Container */}
      <div className="relative flex flex-col items-center justify-center gap-6 px-6">
        
        {/* Premium Shield Icon with Glow Effect */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-xl animate-pulse" />
          
          {/* Inner icon container */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
            <Shield size={48} className="text-white" strokeWidth={1.5} />
          </div>
          
          {/* Rotating border effect */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-transparent bg-clip-border animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Primary Text */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            OmniWealth
          </h2>
          <p className="text-sm md:text-base text-slate-300 font-light tracking-wide">
            Securing your financial data...
          </p>
        </div>

        {/* Loading Indicators - Subtle Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Subtext */}
        <p className="text-xs md:text-sm text-slate-400 font-medium tracking-widest uppercase mt-6">
          Synchronizing vault
        </p>
      </div>
    </div>
  );
}
