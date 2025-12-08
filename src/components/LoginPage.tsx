import React, { useState } from 'react';
import { 
  Users, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { Logo } from './Logo';
import { getUser } from '../services/mockDatabase';
import { UserProfile } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    setLoading(true);
    setLoginError('');
    
    try {
      // Slight delay to allow animation to show (optional, for UX feel)
      const authUser = await getUser(emailInput.trim(), passwordInput);
      
      if (authUser) {
        onLoginSuccess(authUser);
      } else {
        setLoginError('Access Denied: Invalid Email or Password.');
      }
    } catch (e) {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // BACKGROUND: Deep dark "Life Sciences" Blue/Black from v3
    <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* AMBIENT GLOWS - Restored */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#8B1E1E] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#102A63] rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>

      {/* MAIN CARD - Glassmorphism */}
      <div className="relative w-full max-w-md bg-[#0F172A]/0 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8 z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            {/* Using variant="light" because background is dark */}
            <Logo className="h-20" variant="light" />
          </div>
          <div className="text-center">
            <h2 className="text-slate-400 text-xs uppercase tracking-[0.2em] font-semibold mb-1">
              Secure Field Force Management
            </h2>
            <div className="h-0.5 w-12 bg-gradient-to-r from-[#8B1E1E] to-[#102A63] mx-auto rounded-full opacity-70"></div>
          </div>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 pl-1">
              Corporate Email ID
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-slate-500 group-focus-within:text-[#8B1E1E] transition-colors" />
              </div>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-[#8B1E1E] focus:border-transparent block pl-10 p-3 placeholder-slate-600 transition-all outline-none shadow-inner"
                placeholder="employee@tertius.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex justify-between pl-1">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Password
              </label>
              <a
                href="#"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-[#8B1E1E] transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-[#8B1E1E] focus:border-transparent block pl-10 pr-10 p-3 placeholder-slate-600 transition-all outline-none shadow-inner"
                placeholder="••••••••"
              />
              
              {/* Toggle Show/Hide Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 p-3 rounded border border-red-900/50 animate-pulse">
              <ShieldCheck className="w-4 h-4" />
              {loginError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-[#6e1212] to-[#102A63] hover:from-[#8B1E1E] hover:to-[#1e3a8a] text-white font-medium rounded-lg text-sm px-5 py-3 text-center transition-all transform hover:scale-[1.01] shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? "Verifying Credentials..." : "Secure Login"}
              {!loading && (
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
              )}
            </span>

            {/* Shine effect on hover */}
            <div className="absolute inset-0 h-full w-full scale-0 rounded-lg transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10"></div>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600">
            &copy; 2025 Tertius Life Science Pvt Ltd <br /> Protected by Enterprise
            Grade Security.
          </p>
        </div>
      </div>
    </div>
  );
};