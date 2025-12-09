import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Server, Lock, Database } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [activeIcon, setActiveIcon] = useState(0);

  // Cycle through icons to make it feel alive
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setActiveIcon(prev => (prev + 1) % 3);
    }, 800);
    return () => clearInterval(iconInterval);
  }, []);

  useEffect(() => {
    // Fast fill until 80%, then slow down for "realistic" loading feel
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Speed changes based on progress
        const increment = prev > 80 ? 0.2 : 0.8;
        return Math.min(prev + increment, 100);
      });
    }, 20);

    return () => clearInterval(interval);
  }, []);

  // Get status text based on progress
  const getStatusText = () => {
    if (progress < 30) return 'Establishing secure handshake...';
    if (progress < 60) return 'Syncing encrypted database...';
    if (progress < 85) return 'Verifying user biometrics...';
    return 'Finalizing secure environment...';
  };

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-50 overflow-hidden">

      {/* Background Tech Grid (Subtle) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">

        {/* Logo Section with Glow */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 rounded-full animate-pulse"></div>
          <Logo className="h-10 w-auto relative z-10 drop-shadow-2xl" variant="light" />
        </div>

        {/* Loading Icons (Animated) */}
        <div className="flex gap-6 mb-8 text-slate-600">
          <Server size={20} className={`transition-colors duration-500 ${activeIcon === 0 ? 'text-blue-500' : ''}`} />
          <Lock size={20} className={`transition-colors duration-500 ${activeIcon === 1 ? 'text-[#8B1E1E]' : ''}`} />
          <Database size={20} className={`transition-colors duration-500 ${activeIcon === 2 ? 'text-emerald-500' : ''}`} />
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden backdrop-blur-sm mb-4 border border-slate-800">
          {/* The Moving Bar */}
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-[#8B1E1E] to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer Effect */}
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Status Text */}
        <div className="flex flex-col items-center space-y-1">
          <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">
            {getStatusText()}
          </span>
          <span className="text-slate-600 text-[10px] font-mono">
            {Math.floor(progress)}% COMPLETE
          </span>
        </div>

        {/* Bottom Branding (Product Name) */}
        <div className="mt-16 flex items-center gap-2 opacity-50">
          <ShieldCheck size={14} className="text-slate-500" />
          <span className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">
            Tertius Integrity AI
          </span>
        </div>
      </div>

      {/* COPYRIGHT FOOTER (Fixed at absolute bottom) */}
      <div className="absolute bottom-6 w-full text-center">
        <p className="text-slate-200 text-[10px] font-mono tracking-wider opacity-60">
          &copy; {new Date().getFullYear()} Tertius Life Sciences. All rights reserved.
        </p>
      </div>

    </div>
  );
};