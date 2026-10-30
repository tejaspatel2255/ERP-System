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

      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: Drawing Sheet Blueprint Assembly Line (visible lg+) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between sheet p-8 h-full min-h-[560px] relative overflow-hidden bg-bg-card">
          {/* Top header block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sheet-tag text-accent-primary font-bold">DRAWING REF // DWG-OPS-01</span>
              <span className="text-text-muted font-mono text-[11px]">// REV C</span>
            </div>
            <h2 className="font-display uppercase text-3xl font-bold tracking-wider text-text-primary">
              Plant Floor Operations
            </h2>
            <p className="font-sans text-xs text-text-secondary mt-1">
              Integrated discrete manufacturing lifecycle & telemetry gateway.
            </p>
          </div>

          {/* Visual Schematic Assembly Line */}
          <div className="my-8 py-4 space-y-3 relative">
            <div className="sheet-tag text-text-muted mb-3 flex items-center gap-2">
              <span>// PIPELINE SCHEMATIC ROUTE</span>
              <div className="dim-line flex-1" />
            </div>

            {[
              { id: 'ST-01', name: 'PROCURE', desc: 'PO & Vendor Inward GRN' },
              { id: 'ST-02', name: 'MATERIAL QC', desc: 'Raw Material Gating Pass' },
              { id: 'ST-03', name: 'PRODUCTION', desc: 'BOM Work Order Assembly' },
              { id: 'ST-04', name: 'FINAL QC', desc: 'Product Compliance Inspection' },
              { id: 'ST-05', name: 'DISPATCH', desc: 'Packaging & Delivery Challan' }
            ].map((station, idx, arr) => (
              <React.Fragment key={station.id}>
                <div className="flex items-center gap-3 bg-bg-secondary border border-border-color p-2.5">
                  {/* Octagonal station indicator */}
                  <div
                    className="w-10 h-10 bg-bg-card border border-border-strong flex items-center justify-center font-mono font-bold text-[11px] text-accent-primary shrink-0"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                    }}
                  >
                    {station.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display uppercase font-bold text-sm tracking-wide text-text-primary">
                        {station.name}
                      </span>
                      <span className="lamp" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
                    </div>
                    <span className="font-mono text-[11px] text-text-muted block truncate">
                      {station.desc}
                    </span>
                  </div>
                </div>

                {idx < arr.length - 1 && (
                  <div className="mx-6 conveyor conveyor-move" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Bottom engineering title block */}
          <div className="border-t border-border-color pt-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>SECURITY: INDUSTRIAL AIR-GAP</span>
              <span className="text-accent-primary font-bold">// STATION: GATE-01</span>
            </div>
            <div className="dim-line my-2" />
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest text-center">
              ERP NEXUS — MANUFACTURING OPERATIONS CONTROL
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Operator Authentication Form */}
        <div className="w-full lg:col-span-6 max-w-md mx-auto">
          <div className="sheet p-6 sm:p-8 relative bg-bg-card shadow-modal">
            <div className="hazard-strip -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6" />

            {/* Brand Title */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Logo size="md" showText={true} />
                <span className="tb-cell">GATE <b>01</b></span>
              </div>

              <span className="sheet-tag text-accent-primary block font-bold mb-1">
                // OPERATOR AUTHENTICATION
              </span>
              <h1 className="text-2xl font-display font-bold uppercase tracking-wider text-text-primary">
                Console Sign In
              </h1>
              <p className="text-xs text-text-secondary font-sans mt-0.5">
                Authenticate operator credentials to access manufacturing telemetry.
              </p>
            </div>

            {/* Pending Approval Notice */}
            {pendingApproval && (
              <div className="mt-5 sheet border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-[var(--warning-text)]">
                <div className="flex items-center gap-2 font-display uppercase font-bold text-sm tracking-wider">
                  <Clock size={16} className="shrink-0" />
                  <span>Account Pending Approval</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed font-sans opacity-95">
                  Your operator profile is queued for system administrator clearance and role assignment. Console access will unlock upon gate verification.
                </p>
              </div>
            )}

            {/* Error Message Notice */}
            {error && !pendingApproval && (
              <div className="mt-5 sheet border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-[var(--danger-text)]">
                <div className="font-mono text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                  <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '6px', height: '6px' }} />
                  <span>[AUTH FAULT] {error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="field-label flex items-center justify-between">
                  <span>Operator Email</span>
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

              <div>
                <label className="field-label flex items-center justify-between">
                  <span>Security Credential</span>
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

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                <ShieldCheck size={16} />
                <span>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE CONSOLE SESSION'}</span>
              </button>
            </form>

            <div className="dim-line my-5" />

            <div className="text-center font-mono text-xs text-text-muted">
              Unregistered operator?{' '}
              <Link to="/register" className="font-bold text-accent-primary hover:underline uppercase">
                Request Access Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
