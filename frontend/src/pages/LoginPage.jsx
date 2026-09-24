import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Clock, Sun, Moon, Cpu, ShieldCheck, Lock, Mail } from 'lucide-react';

import Logo from '../components/Logo';

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
        setError(err.response?.data?.message || 'Invalid operational credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 text-text-primary transition-colors duration-150 select-none">
      {/* Top Right Palette Switcher */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Palette' : 'Switch to Dark Palette'}
        className="absolute top-5 right-5 flex items-center gap-2 rounded-xs border border-border-color bg-bg-secondary px-3 py-1.5 text-xs font-mono font-bold text-text-secondary hover:text-text-primary shadow-2xs transition-all"
      >
        {isDark ? <Sun size={14} className="text-accent-warning" /> : <Moon size={14} className="text-accent-primary" />}
        <span>{isDark ? 'LIGHT' : 'DARK'} MODE</span>
      </button>

      <div className="w-full max-w-md rounded-sm border border-border-color bg-bg-secondary p-6 sm:p-8 shadow-modal transition-all">
        {/* Brand Console Title */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-accent-primary uppercase tracking-widest mb-1">
            <Cpu size={14} />
            <span>OPERATIONAL AUTHENTICATION</span>
          </div>
          <h1 className="text-xl font-mono font-bold uppercase tracking-tight text-text-primary">Console Operator Login</h1>
          <p className="mt-1 text-xs text-text-muted font-sans">Authenticate to access ERP Nexus enterprise telemetry.</p>
        </div>

        {pendingApproval && (
          <div className="mt-5 rounded-xs border border-warning-border bg-warning-bg p-3 text-warning-text">
            <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase">
              <Clock size={16} className="shrink-0" />
              <span>Account Pending Approval</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed opacity-90 font-sans">
              Your account has been created and is pending administrator review and role assignment. You will be able to log in once access is granted.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-sans">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Operator Email</span>
              <Mail size={12} className="text-text-muted" />
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="operator@enterprise.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Security Credential</span>
              <Lock size={12} className="text-text-muted" />
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="••••••••••••"
              required
            />
          </div>

          {error && !pendingApproval && (
            <div className="rounded-xs border border-danger-border bg-danger-bg px-3 py-2 text-xs font-mono font-bold text-danger-text">
              [AUTH ERROR] {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xs bg-accent-primary px-4 py-2.5 font-mono font-bold uppercase tracking-wider text-xs text-white shadow-2xs hover:bg-accent-secondary disabled:cursor-not-allowed disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} />
            <span>{loading ? 'Authenticating...' : 'Authenticate Console Session'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-mono text-text-muted border-t border-border-color/60 pt-4">
          Unregistered operator?{' '}
          <Link to="/register" className="font-bold text-accent-primary hover:underline uppercase">
            Request Access Account
          </Link>
        </div>
      </div>
    </div>
  );
}
