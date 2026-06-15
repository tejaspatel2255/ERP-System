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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (module && !hasPermission(module, action)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-red-400">403</p>
          <h1 className="mt-2 text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
