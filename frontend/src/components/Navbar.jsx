import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, User, Settings, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
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
    if (segments.length === 0) return 'Dashboard';
    const last = segments[segments.length - 1];
    return last
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const totalNotifications = alertCount + qaCount;

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border-color bg-bg-secondary px-4 shadow-sm transition-colors duration-200">
      {/* Left: Menu click (mobile toggle) + Current Page Name (Breadcrumb) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline font-medium">Pages</span>
          <span className="text-xs text-text-muted hidden sm:inline">/</span>
          <h1 className="text-sm font-bold text-text-primary tracking-wide">{getBreadcrumb()}</h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-accent-primary transition-all duration-200"
          aria-label="Toggle visual theme"
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-accent-primary" />}
        </button>

        {/* Search Icon Button */}
        <button className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
          <Search size={18} />
        </button>

        {/* Bell Icon Button with count badge */}
        <button className="relative rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
          <Bell size={18} />
          {totalNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-danger text-[9px] font-black text-white">
              {totalNotifications}
            </span>
          )}
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-border-color" />


        {/* User initials circle + dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl p-1 text-sm font-semibold hover:bg-bg-hover transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary text-xs font-black text-white shadow-sm">
              {getInitials(user?.name)}
            </div>
            <span className="hidden md:inline text-text-primary">{user?.name || 'User'}</span>
            <ChevronDown size={14} className="text-text-secondary hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay to click off */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 z-50 origin-top-right rounded-xl border border-border-color bg-bg-card p-1 shadow-brand transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                <Link
                  to="/hr/self-service"
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} className="text-text-secondary" />
                  <span>My Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={16} className="text-text-secondary" />
                  <span>Settings</span>
                </Link>
                <div className="my-1 border-t border-border-color" />
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm text-accent-danger hover:bg-bg-hover transition-colors"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
