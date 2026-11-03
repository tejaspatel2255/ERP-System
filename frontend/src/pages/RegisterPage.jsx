import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { Clock, Sun, Moon, AlertCircle, Mail, Lock, User } from 'lucide-react';

import Logo from '../components/Logo';

export default function RegisterPage() {
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
      <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 py-10 text-text-primary">
        <div className="sheet w-full max-w-md p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">
            <Clock size={24} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Registration pending approval</h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Your account for <span className="font-semibold text-accent-primary">{email}</span> has been created successfully.
          </p>
          <div className="mt-4 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-left text-xs text-[var(--warning-text)] leading-relaxed">
            An administrator must review your registration and assign a role to your account before you can access ERP modules.
          </div>
          <div className="mt-6">
            <Link
              to="/login"
              className="btn btn-primary w-full min-h-[38px]"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary py-10 px-4 text-text-primary flex flex-col justify-center">
      {/* Top Right Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="btn btn-ghost btn-icon btn-sm absolute top-6 right-6"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
      </button>

      <div className="sheet w-full max-w-2xl mx-auto p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="md" />
          <h1 className="text-2xl font-semibold text-text-primary mt-4">Create your account</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Get started with your ERP Nexus workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger-text)] flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Personal Details */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Personal details</h3>
            <div className="dim-line mt-2 mb-4" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="field-label">Full name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field pl-9"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Work email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field pl-9"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Account Credentials */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Account credentials</h3>
            <div className="dim-line mt-2 mb-4" />
            <div className="grid sm:grid-cols-2 gap-4">
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
              <div>
                <label className="field-label">Confirm password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field pl-9"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full min-h-[40px]"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
