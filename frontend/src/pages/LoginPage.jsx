import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Mail,
  Lock,
  AlertCircle,
  Clock,
  TrendingUp,
  Package,
  Warehouse,
  Factory,
  CheckCircle,
  Users2
} from 'lucide-react';

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
        setError(err.response?.data?.message || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const platformModules = [
    { label: 'Sales', icon: TrendingUp },
    { label: 'Purchase', icon: Package },
    { label: 'Inventory', icon: Warehouse },
    { label: 'Production', icon: Factory },
    { label: 'Quality', icon: CheckCircle },
    { label: 'HR', icon: Users2 }
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-bg-primary text-text-primary">
      {/* LEFT: Navy Enterprise Showcase Panel (hidden below lg) */}
      <div className="hidden lg:flex flex-col justify-between p-12 shell-bg border-r border-[var(--shell-border)]">
        <div>
          <Logo onDark={true} size="md" />
        </div>

        <div className="my-auto py-8">
          <h1 className="text-3xl font-semibold text-white leading-tight">
            One platform for your entire business
          </h1>
          <p className="mt-3 text-sm text-[var(--shell-text)] max-w-md leading-relaxed">
            Sales, procurement, inventory, production, quality, maintenance and HR — connected in a single system.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
            {platformModules.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded grid place-items-center bg-[var(--shell-bg-active)] text-[var(--shell-accent)] shrink-0">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <span className="text-xs text-[var(--shell-muted)]">© ERP Nexus</span>
        </div>
      </div>

      {/* RIGHT: Login Form Column */}
      <div className="relative flex min-h-screen items-center justify-center bg-bg-card p-6 sm:p-12">
        {/* Top Right Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="btn btn-ghost btn-icon btn-sm absolute top-6 right-6"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        <div className="w-full max-w-sm">
          {/* Logo on smaller screens */}
          <div className="lg:hidden mb-6 flex justify-center">
            <Logo size="md" />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-text-primary">Sign in</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Enter your work credentials to continue.
            </p>
          </div>

          {/* Pending Approval Alert */}
          {pendingApproval && (
            <div className="mt-5 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-[var(--warning-text)] text-sm flex gap-2.5">
              <Clock size={18} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs">Account pending approval</div>
                <div className="text-xs mt-1 leading-relaxed opacity-95">
                  Your account has been created and is pending administrator review and role assignment. You will be able to log in once access is granted.
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && !pendingApproval && (
            <div className="mt-5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-text)] flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="field-label">Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pl-9"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pl-9"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full min-h-[40px] mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
