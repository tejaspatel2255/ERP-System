import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true, className = '' }) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14'
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-lg font-bold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
    xl: 'text-3xl font-bold tracking-tight'
  };

  return (
    <Link to="/dashboard" className={`group flex items-center gap-2.5 select-none ${className}`}>
      {/* Industrial SVG Connected Operations Logo Mark */}
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]}`}>
        <img
          src="/logo.svg"
          alt="ERP Nexus Symbol"
          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-150"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`uppercase text-text-primary leading-none ${textSizes[size]}`}>
            ERP <span className="text-accent-primary font-black">NEXUS</span>
          </span>
          <span className="text-[10px] font-mono font-bold tracking-widest text-text-muted uppercase mt-0.5">
            IND-SYS v2.4
          </span>
        </div>
      )}
    </Link>
  );
}
