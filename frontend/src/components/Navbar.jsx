import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, User, Settings, LogOut, ChevronDown, Sun, Moon, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useTheme } from '../context/ThemeContext';
import { getStockAlerts } from '../api/storeApi';
import { getPendingApprovals } from '../api/qaApi';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { hasPermission } = useRole();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [qaCount, setQaCount] = useState(0);

  // Decorative local time clock for status bar
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      const tasks = [];
      if (hasPermission('store', 'view')) {
        tasks.push(
          getStockAlerts()
            .then((res) => setAlertCount(res.alerts?.length || 0))
            .catch(() => setAlertCount(0))
        );
      }
      if (hasPermission('qa', 'approve')) {
        tasks.push(
          getPendingApprovals()
            .then((res) => setQaCount(res.tests?.length || 0))
            .catch(() => setQaCount(0))
        );
      }
      await Promise.all(tasks);
    };
    load();
  }, [hasPermission]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getBreadcrumb = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'OPERATIONS COMMAND';
    const last = segments[segments.length - 1];
    return last
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .toUpperCase();
  };

  const getInitials = (name) => {
    if (!name) return 'OP';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const totalNotifications = alertCount + qaCount;

  return (
    <header className="relative sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border-strong bg-bg-secondary px-4 transition-colors duration-150 select-none">
      {/* Top Edge: 3px decorative Andon stack-light strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex pointer-events-none">
        <div className="flex-1 bg-[var(--accent-success)] opacity-90" />
        <div className="flex-1 bg-[var(--accent-warning)] opacity-90" />
        <div className="flex-1 bg-[var(--accent-danger)] opacity-90" />
      </div>

      {/* Left: Mobile Menu Toggle + Plant Telemetry Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn btn-ghost btn-icon btn-sm lg:hidden"
          aria-label="Toggle Navigation Rail"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-accent-primary hidden sm:block" />
          <span className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wider hidden sm:inline">
            PLANT <span className="text-accent-primary font-bold">/</span>
          </span>
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider truncate">
            {getBreadcrumb()}
          </h1>
        </div>
      </div>

      {/* Right: Operational Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Decorative Plant Floor Clock Chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 border border-border-color bg-bg-card text-xs font-mono text-text-secondary">
          <span className="lamp" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
          <span className="tracking-wider">{timeStr}</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Vellum (Light)' : 'Switch to Cyanotype (Dark)'}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label="Toggle visual palette"
        >
          {isDark ? <Sun size={16} className="text-accent-warning" /> : <Moon size={16} className="text-accent-primary" />}
        </button>

        {/* Global Search Visual Treatment */}
        <button className="btn btn-ghost btn-icon btn-sm" aria-label="Search System">
          <Search size={16} />
        </button>

        {/* Telemetry Alert Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="btn btn-ghost btn-icon btn-sm relative"
            aria-label="View Telemetry Alerts"
          >
            <Bell size={16} />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '8px', height: '8px' }} />
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-80 z-50 origin-top-right sheet bg-bg-modal shadow-modal border-border-strong">
                <div className="hazard-strip" />
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-color bg-bg-card">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">System Telemetry Alerts</span>
                  {totalNotifications > 0 && (
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-mono font-bold border"
                      style={{
                        backgroundColor: 'var(--danger-bg)',
                        color: 'var(--danger-text)',
                        borderColor: 'var(--danger-border)'
                      }}
                    >
                      {totalNotifications}
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border-color/50 font-sans">
                  {alertCount > 0 && (
                    <Link
                      to="/store/stock-position"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
                    >
                      <span className="mt-1 lamp lamp-pulse shrink-0" style={{ '--lamp': 'var(--accent-danger)', width: '8px', height: '8px' }} />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{alertCount} Low / Critical Stock Items</p>
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">Open stock position ledger</p>
                      </div>
                    </Link>
                  )}
                  {qaCount > 0 && (
                    <Link
                      to="/qa/reports"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
                    >
                      <span className="mt-1 lamp shrink-0" style={{ '--lamp': 'var(--accent-warning)', width: '8px', height: '8px' }} />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{qaCount} QA Reports Pending Review</p>
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">Review quality inspection gates</p>
                      </div>
                    </Link>
                  )}
                  {totalNotifications === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-text-muted">
                      <Bell size={20} className="mb-1.5 opacity-40" />
                      <p className="text-xs font-mono uppercase tracking-wider">No active telemetry faults</p>
                    </div>
                  )}
                </div>
                <div className="px-3.5 py-2 border-t border-border-color bg-bg-card">
                  <p className="text-[10px] font-mono text-text-muted text-center uppercase tracking-wider">// TELEMETRY POLLING ACTIVE //</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-border-strong opacity-60" />

        {/* User Identity Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 text-xs hover:bg-bg-hover transition-colors border border-transparent hover:border-border-color"
          >
            <div className="flex h-7 w-7 items-center justify-center border border-border-strong bg-accent-primary text-on-accent font-display text-sm font-bold">
              {getInitials(user?.name)}
            </div>
            <span className="hidden md:inline font-mono text-xs font-semibold text-text-primary">{user?.name || 'Operator'}</span>
            <ChevronDown size={14} className="text-text-muted hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-48 z-50 origin-top-right sheet bg-bg-modal shadow-modal border-border-strong p-1">
                <Link
                  to="/hr/self-service"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={14} className="text-text-muted" />
                  <span>Operator Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={14} className="text-text-muted" />
                  <span>System Settings</span>
                </Link>
                <div className="my-1 border-t border-border-color" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-mono font-bold text-accent-danger hover:bg-[var(--danger-bg)] transition-colors"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={14} />
                  <span>Terminate Session</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
