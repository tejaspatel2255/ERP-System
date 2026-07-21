import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/authApi';
import toast from 'react-hot-toast';
import { Clock, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-slate-950/90 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <Clock size={36} />
          </div>
          <h1 className="text-2xl font-bold text-white">Registration Pending Approval</h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Your account for <span className="font-semibold text-cyan-400">{email}</span> has been created successfully.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-left text-xs text-amber-200">
            An administrator must review your registration and assign a role to your account before you can access ERP modules.
          </div>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-block w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl font-black text-cyan-300">
            ERP
          </div>
          <h1 className="text-3xl font-black">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Get started with your ERP account.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
