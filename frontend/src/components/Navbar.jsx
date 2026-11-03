import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [qaCount, setQaCount] = useState(0);
  const [alertsList, setAlertsList] = useState([]);

  useEffect(() => {
    const load = async () => {
      const tasks = [];
      if (hasPermission('store', 'view')) {
        tasks.push(
          getStockAlerts()
            .then((res) => {
              const list = res.alerts || [];
              setAlertCount(list.length);
              setAlertsList(list.slice(0, 5));
            })
            .catch(() => {
              setAlertCount(0);
              setAlertsList([]);
            })
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
    <header className="topbar sticky top-0 z-30 flex h-[60px] items-center justify-between px-4 sm:px-6">
      {/* Left: mobile menu button + search button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn btn-ghost btn-icon btn-sm lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            const searchInput = document.querySelector('input[type="text"]');
            if (searchInput) searchInput.focus();
          }}
          className="hidden sm:flex items-center gap-2 h-9 w-64 lg:w-80 rounded border border-border-input bg-bg-secondary px-3 text-sm text-text-muted hover:border-border-strong transition-colors text-left"
        >
          <Search size={16} className="text-text-muted shrink-0" />
          <span>Search…</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label="Toggle visual theme"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        {/* Bell Icon Button with notification dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen((prev) => !prev)}
            className="btn btn-ghost btn-icon btn-sm relative"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[var(--accent-danger)] text-white text-[10px] font-semibold grid place-items-center px-1">
                {totalNotifications}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sheet shadow-modal z-50">
                <div className="px-4 py-3 border-b border-border-color text-sm font-semibold text-text-primary">
                  Notifications
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border-color">
                  {totalNotifications === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-text-muted">
                      No new notifications
                    </div>
                  ) : (
                    <>
                      {alertCount > 0 && (
                        <Link
                          to="/store/alerts"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="block px-4 py-2.5 text-sm hover:bg-bg-hover transition-colors"
                        >
                          <div className="font-medium text-text-primary">Stock alerts</div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {alertCount} item{alertCount > 1 ? 's' : ''} require attention
                          </div>
                        </Link>
                      )}
                      {qaCount > 0 && (
                        <Link
                          to="/qa/tests"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="block px-4 py-2.5 text-sm hover:bg-bg-hover transition-colors"
                        >
                          <div className="font-medium text-text-primary">QA approvals</div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {qaCount} pending test approval{qaCount > 1 ? 's' : ''}
                          </div>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-border-color" />

        {/* User initials circle + dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-accent-primary text-on-accent text-xs font-semibold grid place-items-center shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-sm font-medium text-text-primary truncate max-w-[120px]">
                {user?.name || 'User'}
              </span>
              <span className="text-xs text-text-muted capitalize truncate max-w-[120px]">
                {user?.role || 'Operator'}
              </span>
            </div>
            <ChevronDown size={14} className="text-text-secondary hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay to click off */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 sheet shadow-modal z-50">
                <div className="px-4 py-3 border-b border-border-color md:hidden">
                  <div className="text-sm font-medium text-text-primary">{user?.name || 'User'}</div>
                  <div className="text-xs text-text-muted capitalize">{user?.role || 'Operator'}</div>
                </div>
                <div className="p-1 space-y-0.5">
                  <Link
                    to="/hr/self-service"
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User size={16} className="text-text-secondary" />
                    <span>My profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings size={16} className="text-text-secondary" />
                    <span>Settings</span>
                  </Link>
                  <div className="my-1 border-t border-border-color" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[var(--danger-text)] hover:bg-bg-hover transition-colors"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
