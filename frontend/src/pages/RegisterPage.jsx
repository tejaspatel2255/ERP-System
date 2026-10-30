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
      <div className="relative min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md sheet p-6 sm:p-8 text-center bg-bg-card shadow-modal relative">
          <div className="hazard-strip -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6" />

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]">
            <Clock size={24} />
          </div>

          <span className="sheet-tag text-accent-warning font-bold block mb-1">
            // STATUS: QUEUED FOR APPROVAL
          </span>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider text-text-primary">
            Registration Submitted
          </h1>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed font-sans">
            Your access request for <span className="font-mono font-bold text-accent-primary">{email}</span> has been dispatched to plant security.
          </p>

          <div className="mt-4 sheet border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-left text-xs text-[var(--warning-text)] font-sans">
            An enterprise administrator must verify your identity and assign an operational role matrix before console access is enabled.
          </div>

          <div className="mt-6">
            <Link
              to="/login"
              className="btn btn-primary w-full"
            >
              Return to Console Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary flex flex-col justify-center select-none p-4 sm:p-6 lg:p-10">
      {/* Top Right Palette Switcher */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Vellum (Light)' : 'Switch to Cyanotype (Dark)'}
        className="btn btn-ghost btn-sm absolute top-5 right-5 flex items-center gap-2 z-20"
      >
        {isDark ? <Sun size={14} className="text-accent-warning" /> : <Moon size={14} className="text-accent-primary" />}
        <span className="font-mono text-xs">{isDark ? 'LIGHT' : 'DARK'}</span>
      </button>

      <div className="w-full max-w-xl mx-auto">
        <div className="sheet p-6 sm:p-8 bg-bg-card shadow-modal relative">
          <div className="hazard-strip -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6" />

          <div className="flex items-center justify-between mb-4">
            <Logo size="md" showText={true} />
            <span className="tb-cell">REG <b>USER</b></span>
          </div>

          <span className="sheet-tag text-accent-primary block font-bold mb-1">
            // OPERATOR REGISTRATION
          </span>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider text-text-primary">
            Request Access Account
          </h1>
          <p className="text-xs text-text-secondary font-sans mt-0.5">
            Register operator identity profile for ERP Nexus plant-floor authorization.
          </p>

          <div className="dim-line my-4" />

          {error && (
            <div className="mb-4 sheet border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-[var(--danger-text)]">
              <div className="font-mono text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '6px', height: '6px' }} />
                <span>[REGISTRATION FAULT] {error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identity Section */}
            <div className="space-y-3.5">
              <div className="sheet-tag text-text-muted">SECTION 01 // OPERATOR IDENTITY</div>
              <div>
                <label className="field-label flex items-center justify-between">
                  <span>Full Legal / Operator Name</span>
                  <User size={12} className="text-text-muted" />
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field"
                  placeholder="Operator Name"
                  required
                />
              </div>

              <div>
                <label className="field-label flex items-center justify-between">
                  <span>Enterprise Email Address</span>
                  <Mail size={12} className="text-text-muted" />
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="operator@enterprise.com"
                  required
                />
              </div>
            </div>

            <div className="dim-line my-3" />

            {/* Credential Section */}
            <div className="space-y-3.5">
              <div className="sheet-tag text-text-muted">SECTION 02 // ACCESS CREDENTIALS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="field-label flex items-center justify-between">
                    <span>Security Password</span>
                    <Lock size={12} className="text-text-muted" />
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="field-label flex items-center justify-between">
                    <span>Confirm Password</span>
                    <Lock size={12} className="text-text-muted" />
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                <UserPlus size={16} />
                <span>{loading ? 'SUBMITTING REQUEST...' : 'SUBMIT OPERATOR REGISTRATION'}</span>
              </button>
            </div>
          </form>

          <div className="dim-line my-5" />

          <div className="text-center font-mono text-xs text-text-muted">
            Existing operator account?{' '}
            <Link to="/login" className="font-bold text-accent-primary hover:underline uppercase">
              Sign In to Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
