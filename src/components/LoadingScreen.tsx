import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-50 overflow-hidden font-sans">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#8B1E1E] opacity-10 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900 opacity-10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-10 relative transform hover:scale-105 transition-transform duration-700">
            <div className="absolute inset-0 bg-[#8B1E1E] blur-2xl opacity-20 animate-pulse"></div>
            <Logo className="h-20 relative z-10" variant="light" />
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-t-[#8B1E1E] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            
            <div className="text-center space-y-1">
                <h2 className="text-white font-bold text-lg tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                    <ShieldCheck size={16} className="text-[#8B1E1E]" />
                    TERTIUS LIFE SCIENCE
                </h2>
                <p className="text-slate-500 text-xs font-mono animate-pulse">
                    Initializing Secure Environment...
                </p>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-slate-700 text-[10px] font-mono tracking-widest">
        VER 1.5.0 • TERTIUS SCIENCE
      </div>
    </div>
  );
};