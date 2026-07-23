import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true, className = '' }) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <Link to="/dashboard" className={`group flex items-center gap-2.5 transition-transform hover:scale-[1.02] ${className}`}>
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300 ${sizeClasses[size]}`}>
        <img
          src="/logo.png"
          alt="ERP Nexus Logo"
          className="h-full w-full rounded-[10px] object-cover"
          onError={(e) => {
            // Fallback if image load fails
            e.target.style.display = 'none';
          }}
        />
      </div>
      {showText && (
        <span className={`font-black tracking-wider text-text-primary ${textSizes[size]}`}>
          ERP <span className="bg-gradient-to-r from-accent-primary via-purple-400 to-accent-secondary bg-clip-text text-transparent">Nexus</span>
        </span>
      )}
    </Link>
  );
}
