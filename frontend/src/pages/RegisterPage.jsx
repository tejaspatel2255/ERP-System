import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { Clock, Sun, Moon } from 'lucide-react';

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
      <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-4 text-text-primary transition-colors duration-200">
        <div className="w-full max-w-md rounded-3xl border border-warning-border bg-bg-secondary p-8 text-center shadow-brand">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-bg text-warning-text">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-black text-text-primary">Registration Pending Approval</h1>
          <p className="mt-3 text-xs text-text-secondary leading-relaxed">
            Your account for <span className="font-semibold text-accent-primary">{email}</span> has been created successfully.
          </p>
          <div className="mt-4 rounded-2xl border border-warning-border bg-warning-bg p-4 text-left text-xs text-warning-text">
            An administrator must review your registration and assign a role to your account before you can access ERP modules.
          </div>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-block w-full rounded-xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-sm"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-black text-text-primary">Create account</h1>
          <p className="mt-1.5 text-xs text-text-muted">Get started with your ERP account.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary">Email Address</label>
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
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-xs font-semibold text-danger-text">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-accent-primary px-4 py-3 font-semibold text-sm text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 transition-all"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
