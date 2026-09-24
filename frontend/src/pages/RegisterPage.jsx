import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { Clock, Sun, Moon, Cpu, UserPlus, ShieldCheck, Mail, Lock, User } from 'lucide-react';

import Logo from '../components/Logo';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerUser(name, email, password);
      toast.success('Registration submitted! Pending admin approval.');
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 text-text-primary transition-colors duration-150 select-none">
        <div className="w-full max-w-md rounded-sm border border-warning-border bg-bg-secondary p-6 sm:p-8 text-center shadow-modal">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xs bg-warning-bg text-warning-text border border-warning-border">
            <Clock size={24} />
          </div>
          <h1 className="text-xl font-mono font-bold uppercase tracking-tight text-text-primary">Registration Pending Approval</h1>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed font-sans">
            Your access request for <span className="font-mono font-bold text-accent-primary">{email}</span> has been created successfully.
          </p>
          <div className="mt-4 rounded-xs border border-warning-border bg-warning-bg p-3 text-left text-xs text-warning-text font-sans">
            An administrator must review your registration and assign an operational role to your account before console access is granted.
          </div>
          <div className="mt-5">
            <Link
              to="/login"
              className="inline-block w-full rounded-xs bg-accent-primary px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white transition hover:bg-accent-secondary shadow-2xs"
            >
              Return to Console Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-accent-primary uppercase tracking-widest mb-1">
            <Cpu size={14} />
            <span>OPERATOR REGISTRATION</span>
          </div>
          <h1 className="text-xl font-mono font-bold uppercase tracking-tight text-text-primary">Request Access Account</h1>
          <p className="mt-1 text-xs text-text-muted font-sans">Register credential profile for ERP Nexus access.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 font-sans">
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Full Name</span>
              <User size={12} className="text-text-muted" />
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="Operator Name"
              required
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Email Address</span>
              <Mail size={12} className="text-text-muted" />
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="operator@enterprise.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Security Password</span>
              <Lock size={12} className="text-text-muted" />
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="••••••••••••"
              required
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
              <span>Confirm Password</span>
              <Lock size={12} className="text-text-muted" />
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xs border border-border-color bg-bg-card px-3.5 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="••••••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xs border border-danger-border bg-danger-bg px-3 py-2 text-xs font-mono font-bold text-danger-text">
              [REGISTRATION ERROR] {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xs bg-accent-primary px-4 py-2.5 font-mono font-bold uppercase tracking-wider text-xs text-white shadow-2xs hover:bg-accent-secondary disabled:cursor-not-allowed disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            <span>{loading ? 'Submitting...' : 'Submit Access Request'}</span>
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-mono text-text-muted border-t border-border-color/60 pt-3">
          Existing account?{' '}
          <Link to="/login" className="font-bold text-accent-primary hover:underline uppercase">
            Sign In to Console
          </Link>
        </div>
      </div>
    </div>
  );
}
