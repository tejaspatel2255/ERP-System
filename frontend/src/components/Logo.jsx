import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true, className = '' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-14 w-14 text-xl'
  };

  const textSizes = {
    sm: 'text-sm tracking-tight',
    md: 'text-base tracking-tight',
    lg: 'text-xl tracking-tight',
    xl: 'text-2xl tracking-tight'
  };

  return (
    <Link to="/dashboard" className={`group flex items-center gap-2.5 select-none ${className}`}>
      {/* Industrial Console Badge Mark */}
      <div className={`relative flex items-center justify-center rounded-sm bg-bg-card border border-border-color font-mono font-black text-text-primary shadow-2xs group-hover:border-accent-primary transition-colors duration-200 ${sizeClasses[size]}`}>
        <span className="text-accent-primary group-hover:scale-105 transition-transform duration-150">NX</span>
        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent-success" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black uppercase tracking-wider text-text-primary leading-none ${textSizes[size]}`}>
            ERP <span className="text-accent-primary">NEXUS</span>
          </span>
          <span className="text-[9px] font-mono font-bold tracking-widest text-text-muted uppercase mt-0.5">
            IND-SYS v2.4
          </span>
        </div>
      )}
    </Link>
  );
}
