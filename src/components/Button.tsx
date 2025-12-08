import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Updated Base Styles: Dark mode offsets, smoother transitions, active click scale
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0F172A] disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    // Integrity Red Theme
    primary: "bg-[#8B1E1E] text-white hover:bg-[#a02626] shadow-lg shadow-red-900/20 focus:ring-[#8B1E1E]",
    
    // Dark Slate Secondary
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 focus:ring-slate-500",
    
    // Dark Mode Danger
    danger: "bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900/80 focus:ring-red-500",
    
    // Dark Mode Success
    success: "bg-green-900/50 text-green-200 border border-green-900 hover:bg-green-900/80 focus:ring-green-500",
    
    // Glassy Outline
    outline: "border border-slate-600 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white hover:border-slate-500 focus:ring-slate-500",
    
    // Transparent Ghost (Good for icons)
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/10 focus:ring-slate-500"
  };

  const sizes = {
    xs: "h-7 px-2 text-[10px]",
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};