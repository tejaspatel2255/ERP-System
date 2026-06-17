import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 lg:flex lg:flex-col">
        <Navbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        <main className="min-h-[calc(100vh-60px)] bg-bg-primary">
          {/* Key on pathname to restart fade-in animation on route change */}
          <div key={location.pathname} className="animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
