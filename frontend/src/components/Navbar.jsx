import React, { useEffect, useState } from 'react';
import { Bell, Menu, UserCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { getStockAlerts } from '../api/storeApi';
import { getPendingApprovals } from '../api/qaApi';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { hasPermission } = useRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [qaCount, setQaCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const tasks = [];
      if (hasPermission('store', 'view')) {
        tasks.push(getStockAlerts().then((res) => setAlertCount(res.alerts?.length || 0)).catch(() => setAlertCount(0)));
      }
      if (hasPermission('qa', 'approve')) {
        tasks.push(getPendingApprovals().then((res) => setQaCount(res.tests?.length || 0)).catch(() => setQaCount(0)));
      }
      await Promise.all(tasks);
    };
    load();
  }, [hasPermission]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden">
          <Menu size={20} />
        </button>
        <div>
          <div className="text-sm font-bold text-white">ERP Nexus</div>
          <div className="text-xs text-slate-500">Operations suite</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300">
          <Bell size={18} />
          {(alertCount + qaCount) > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {alertCount + qaCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button onClick={() => setOpen((prev) => !prev)} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            <UserCircle2 size={18} />
            <span className="hidden sm:inline">{user?.name || 'User'}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
              <Link to="/hr/self-service" className="block px-4 py-3 text-sm text-slate-200 hover:bg-slate-800" onClick={() => setOpen(false)}>
                My Profile
              </Link>
              <button
                className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
