import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';

export default function ProtectedRoute({ module, action = 'view', children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission } = useRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary gap-2">
        <Loader2 className="animate-spin text-accent-primary" size={20} />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (module && !hasPermission(module, action)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="sheet p-8 text-center max-w-md w-full">
          <p className="text-xs font-semibold text-[var(--danger-text)]">403</p>
          <h1 className="mt-2 text-xl font-semibold text-text-primary">Access denied</h1>
          <p className="mt-2 text-sm text-text-secondary">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
