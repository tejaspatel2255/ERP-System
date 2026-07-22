import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Clock, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPendingApproval(false);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_PENDING_APPROVAL') {
        setPendingApproval(true);
      } else {
        setError(err.response?.data?.message || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 text-text-primary transition-colors duration-200">
      {/* Top Right Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-6 right-6 flex items-center gap-2 rounded-xl border border-border-color bg-bg-secondary px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary shadow-xs transition-all"
      >
        {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-accent-primary" />}
        <span>{isDark ? 'Light' : 'Dark'} Mode</span>
      </button>

      <div className="w-full max-w-md rounded-3xl border border-border-color bg-bg-secondary p-8 shadow-brand transition-all">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary text-white text-xl font-black shadow-md">
            EN
          </div>
          <h1 className="text-2xl font-black text-text-primary">Welcome back</h1>
          <p className="mt-1.5 text-xs text-text-muted">Sign in to access your Hina Industries ERP workspace.</p>
        </div>

        {pendingApproval && (
          <div className="mt-6 rounded-2xl border border-warning-border bg-warning-bg p-4 text-warning-text">
            <div className="flex items-center gap-2.5 font-bold text-sm">
              <Clock size={18} className="shrink-0" />
              <span>Account Pending Approval</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              Your account has been created and is pending administrator review and role assignment. You will be able to log in once access is granted.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && !pendingApproval && (
            <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-xs font-semibold text-danger-text">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-accent-primary px-4 py-3 font-semibold text-sm text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 transition-all"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-accent-primary hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
