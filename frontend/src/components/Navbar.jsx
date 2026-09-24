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
    if (segments.length === 0) return 'Operations Command';
    const last = segments[segments.length - 1];
    return last
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between border-b border-border-color bg-bg-secondary px-4 transition-colors duration-150 select-none">
      {/* Left: Mobile Menu Toggle + Industrial Telemetry Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-sm p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-accent-primary hidden sm:block" />
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider hidden sm:inline">CONSOLE /</span>
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">{getBreadcrumb()}</h1>
        </div>
      </div>

      {/* Right: Operational Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Palette' : 'Switch to Industrial Dark'}
          className="flex items-center justify-center rounded-sm p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-all duration-150 border border-transparent hover:border-border-color"
          aria-label="Toggle visual palette"
        >
          {isDark ? <Sun size={17} className="text-accent-warning" /> : <Moon size={17} className="text-accent-primary" />}
        </button>

        {/* Global Search Visual Treatment */}
        <button className="rounded-sm p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors border border-transparent hover:border-border-color">
          <Search size={17} />
        </button>

        {/* Telemetry Alert Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative rounded-sm p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors border border-transparent hover:border-border-color"
          >
            <Bell size={17} />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-accent-danger text-[10px] leading-none font-mono font-bold text-white shadow-2xs">
                {totalNotifications}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-80 z-50 origin-top-right rounded-sm border border-border-color bg-bg-modal shadow-modal">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-bg-card">
                  <span className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">System Telemetry Alerts</span>
                  {totalNotifications > 0 && (
                    <span className="rounded-xs bg-accent-danger/20 border border-accent-danger/40 px-2 py-0.5 text-xs font-mono font-bold text-accent-danger">{totalNotifications}</span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border-color/50">
                  {alertCount > 0 && (
                    <Link
                      to="/store/stock-position"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-accent-danger animate-pulse shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{alertCount} Low / Critical Stock Items</p>
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">Click to view stock position ledger</p>
                      </div>
                    </Link>
                  )}
                  {qaCount > 0 && (
                    <Link
                      to="/qa/reports"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-accent-warning shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{qaCount} QA Reports Pending Gate Approval</p>
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">Click to review quality checks</p>
                      </div>
                    </Link>
                  )}
                  {totalNotifications === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-text-muted">
                      <Bell size={20} className="mb-1.5 opacity-40" />
                      <p className="text-xs font-mono">No active telemetry warnings</p>
                    </div>
                  )}
                </div>
                <div className="px-3.5 py-2 border-t border-border-color bg-bg-card">
                  <p className="text-[10px] font-mono text-text-muted text-center uppercase tracking-wider">Telemetry polling active</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-border-color" />

        {/* User Identity Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-sm p-1 text-xs font-semibold hover:bg-bg-hover transition-colors border border-transparent hover:border-border-color"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-accent-primary text-xs font-mono font-bold text-white shadow-2xs">
              {getInitials(user?.name)}
            </div>
            <span className="hidden md:inline font-mono text-sm font-semibold text-text-primary">{user?.name || 'Operator'}</span>
            <ChevronDown size={14} className="text-text-muted hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-48 z-50 origin-top-right rounded-sm border border-border-color bg-bg-modal p-1 shadow-modal">
                <Link
                  to="/hr/self-service"
                  className="flex items-center gap-2 rounded-xs px-3.5 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={15} className="text-text-muted" />
                  <span>Operator Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-xs px-3.5 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={15} className="text-text-muted" />
                  <span>System Settings</span>
                </Link>
                <div className="my-1 border-t border-border-color" />
                <button
                  className="flex w-full items-center gap-2 rounded-xs px-3.5 py-2.5 text-left text-xs font-bold text-accent-danger hover:bg-accent-danger/10 transition-colors"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={15} />
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
