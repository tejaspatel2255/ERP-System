import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';

export default function ProtectedRoute({ module, action = 'view', children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission } = useRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary font-mono">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin border-2 border-border-color border-t-accent-primary" />
          <span>INITIALIZING TELEMETRY SESSION...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (module && !hasPermission(module, action)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-6 text-text-primary">
        <div className="sheet max-w-md w-full p-6 text-center">
          <div className="hazard-strip -mx-6 -mt-6 mb-5" />
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent-danger">[FAULT 403 // RESTRICTED]</p>
          <h1 className="mt-2 text-2xl font-display font-bold uppercase tracking-wider text-text-primary">Access Denied</h1>
          <p className="mt-2 text-sm text-text-secondary font-sans">You do not have operator authorization to access this terminal domain.</p>
        </div>
      </div>
    );
  }

  return children;
}
