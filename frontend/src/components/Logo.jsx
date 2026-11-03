import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true, className = '', onDark = false }) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12'
  };

  const textPrimaryColor = onDark ? 'text-white' : 'text-text-primary';
  const sublabelColor = onDark ? 'text-[#7F93AD]' : 'text-text-muted';

  return (
    <Link to="/dashboard" className={`group flex items-center gap-2.5 transition-opacity hover:opacity-95 ${className}`}>
      <div className={`relative flex items-center justify-center rounded shrink-0 overflow-hidden ${sizeClasses[size] || sizeClasses.md}`}>
        <img
          src="/logo.svg"
          alt="ERP Nexus Logo"
          className="h-full w-full object-contain"
          onError={(e) => {
            // Fallback if svg fails
            e.currentTarget.src = '/logo.png';
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-semibold text-base ${textPrimaryColor}`}>
            ERP Nexus
          </span>
          <span className={`text-[11px] font-normal mt-0.5 ${sublabelColor}`}>
            Enterprise Suite
          </span>
        </div>
      )}
    </Link>
  );
}
