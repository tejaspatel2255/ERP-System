import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { getStockAlerts } from '../api/storeApi';
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  TrendingUp,
  UserCheck,
  FileText,
  ShoppingCart,
  Receipt,
  BarChart2,
  Package,
  Truck,
  ClipboardList,
  Warehouse,
  Box,
  PackageCheck,
  PackageMinus,
  BookOpen,
  AlertTriangle,
  Factory,
  Layers,
  Wrench,
  Calendar,
  Settings,
  HardDrive,
  CheckCircle,
  Send,
  Users2,
  Palette,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const groups = [
  {
    key: 'admin',
    title: 'Admin',
    permission: ['auth', 'view'],
    icon: Shield,
    items: [
      { label: 'Users', to: '/users', permission: ['auth', 'view'], icon: Users },
      { label: 'Roles', to: '/roles', permission: ['auth', 'view'], icon: Shield },
      { label: 'Activity Logs', to: '/activity-logs', permission: ['auth', 'view'], icon: Activity }
    ]
  },
  {
    key: 'sales',
    title: 'Sales',
    permission: ['sales', 'view'],
    icon: TrendingUp,
    items: [
      { label: 'Customers', to: '/sales/customers', permission: ['sales', 'view'], icon: UserCheck },
      { label: 'Quotations', to: '/sales/quotations', permission: ['sales', 'view'], icon: FileText },
      { label: 'Orders', to: '/sales/orders', permission: ['sales', 'view'], icon: ShoppingCart },
      { label: 'Invoices', to: '/sales/invoices', permission: ['sales', 'view'], icon: Receipt },
      { label: 'Reports', to: '/sales/reports', permission: ['sales', 'view'], icon: BarChart2 }
    ]
  },
  {
    key: 'purchase',
    title: 'Purchase',
    permission: ['purchase', 'view'],
    icon: Package,
    items: [
      { label: 'Vendors', to: '/purchase/vendors', permission: ['purchase', 'view'], icon: Truck },
      { label: 'Purchase Orders', to: '/purchase/orders', permission: ['purchase', 'view'], icon: ClipboardList },
      { label: 'Vendor Invoices', to: '/purchase/invoices', permission: ['purchase', 'view'], icon: Receipt },
      { label: 'Analytics', to: '/purchase/analytics', permission: ['purchase', 'view'], icon: BarChart2 }
    ]
  },
  {
    key: 'store',
    title: 'Store',
    permission: ['store', 'view'],
    icon: Warehouse,
    items: [
      { label: 'Items', to: '/store/items', permission: ['store', 'view'], icon: Box },
      { label: 'GRN', to: '/store/grn', permission: ['store', 'view'], icon: PackageCheck },
      { label: 'Stock Issue', to: '/store/issue', permission: ['store', 'view'], icon: PackageMinus },
      { label: 'Stock Ledger', to: '/store/ledger', permission: ['store', 'view'], icon: BookOpen },
      { label: 'Alerts', to: '/store/alerts', permission: ['store', 'view'], icon: AlertTriangle, alertBadge: true }
    ]
  },
  {
    key: 'production',
    title: 'Production',
    permission: ['production', 'view'],
    icon: Factory,
    items: [
      { label: 'Bill of Materials', to: '/production/bom', permission: ['production', 'view'], icon: Layers },
      { label: 'Work Orders', to: '/production/work-orders', permission: ['production', 'view'], icon: Wrench },
      { label: 'Schedule', to: '/production/schedule', permission: ['production', 'view'], icon: Calendar }
    ]
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    permission: ['maintenance', 'view'],
    icon: Settings,
    items: [
      { label: 'Assets', to: '/maintenance/assets', permission: ['maintenance', 'view'], icon: HardDrive },
      { label: 'Schedules', to: '/maintenance/schedules', permission: ['maintenance', 'view'], icon: Calendar },
      { label: 'Issues', to: '/maintenance/issues', permission: ['maintenance', 'view'], icon: AlertTriangle }
    ]
  },
  {
    key: 'qa',
    title: 'Quality Assurance',
    permission: ['qa', 'view'],
    icon: CheckCircle,
    items: [
      { label: 'Checklists', to: '/qa/checklists', permission: ['qa', 'view'], icon: ClipboardList },
      { label: 'QA Tests', to: '/qa/tests', permission: ['qa', 'view'], icon: CheckCircle }
    ]
  },
  {
    key: 'qc',
    title: 'Quality Control',
    permission: ['qc', 'view'],
    icon: Shield,
    items: [
      { label: 'Raw Material QC', to: '/qc/raw-material', permission: ['qc', 'view'], icon: Shield },
      { label: 'In-Process QC', to: '/qc/in-process', permission: ['qc', 'view'], icon: Shield },
      { label: 'Final QC', to: '/qc/final', permission: ['qc', 'view'], icon: Shield },
      { label: 'NCR', to: '/qc/ncr', permission: ['qc', 'view'], icon: Shield }
    ]
  },
  {
    key: 'dispatch',
    title: 'Dispatch',
    permission: ['dispatch', 'view'],
    icon: Send,
    items: [
      { label: 'Packing Slips', to: '/dispatch/packing-slips', permission: ['dispatch', 'view'], icon: FileText },
      { label: 'Delivery Challans', to: '/dispatch/challans', permission: ['dispatch', 'view'], icon: Send },
      { label: 'Schedule', to: '/dispatch/schedule', permission: ['dispatch', 'view'], icon: Calendar }
    ]
  },
  {
    key: 'hr',
    title: 'HR',
    permission: ['hr', 'view'],
    icon: Users2,
    items: [
      { label: 'Employees', to: '/hr/employees', permission: ['hr', 'view'], icon: Users2 },
      { label: 'Attendance', to: '/hr/attendance', permission: ['hr', 'view'], icon: Calendar },
      { label: 'Leave', to: '/hr/leave', permission: ['hr', 'view'], icon: FileText },
      { label: 'Self Service', to: '/hr/self-service', permission: ['hr', 'view'], icon: UserCheck },
      { label: 'Training', to: '/hr/training', permission: ['hr', 'view'], icon: BookOpen }
    ]
  },
  {
    key: 'design',
    title: 'Design',
    permission: ['design', 'view'],
    icon: Palette,
    items: [
      { label: 'Design Files', to: '/design/files', permission: ['design', 'view'], icon: Palette },
      { label: 'Tasks', to: '/design/tasks', permission: ['design', 'view'], icon: ClipboardList },
      { label: 'Reviews', to: '/design/reviews', permission: ['design', 'view'], icon: CheckCircle }
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const { hasPermission, isAdmin } = useRole();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [expandedGroups, setExpandedGroups] = useState({
    admin: true,
    sales: true,
    purchase: true,
    store: true,
    production: true,
    maintenance: true,
    qa: true,
    qc: true,
    dispatch: true,
    hr: true,
    design: true
  });
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (hasPermission('store', 'view')) {
        try {
          const res = await getStockAlerts();
          setAlertCount(res.alerts?.length || 0);
        } catch {
          setAlertCount(0);
        }
      }
    };
    load();
  }, [hasPermission]);

  const visibleGroups = useMemo(() => {
    return groups.filter((group) => isAdmin || hasPermission(group.permission[0], group.permission[1]));
  }, [hasPermission, isAdmin]);

  const toggleSidebar = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderLink = (item, isMobileView = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={isMobileView ? onClose : undefined}
        title={collapsed && !isMobileView ? item.label : ''}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-250 ${
            isActive
              ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-brand border-l-4 border-accent-secondary'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`
        }
      >
        <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
        {(!collapsed || isMobileView) && (
          <span className="flex-1 truncate transition-opacity duration-300">{item.label}</span>
        )}
        {item.alertBadge && alertCount > 0 && (
          <span className="absolute right-2 rounded-full bg-accent-danger px-2 py-0.5 text-[10px] font-bold text-white">
            {alertCount}
          </span>
        )}
      </NavLink>
    );
  };

  // 1. Mobile Sidebar Render (Always 240px width drawer slide-in)
  const mobileSidebarContent = (
    <div className="flex h-full w-[240px] flex-col border-r border-border-color bg-bg-secondary text-text-primary">
      <div className="flex h-[60px] items-center justify-between border-b border-border-color px-5">
        <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent font-black tracking-wider text-xl">
          ERP Nexus
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-text-secondary hover:bg-bg-hover hover:text-text-primary lg:hidden"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <div className="space-y-3">
          {visibleGroups.map((group) => (
            <div key={group.key} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                  .map((item) => renderLink(item, true))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 2. Desktop Sidebar Render (Collapsible width 64px to 240px)
  const desktopSidebarContent = (
    <div
      className={`relative flex h-full flex-col border-r border-border-color bg-bg-secondary text-text-primary transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header */}
      <div className="flex h-[60px] items-center justify-between border-b border-border-color px-4">
        {!collapsed ? (
          <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent font-black tracking-wider text-xl transition-all duration-300">
            ERP Nexus
          </span>
        ) : (
          <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent font-black text-xl mx-auto transition-all duration-300">
            EN
          </span>
        )}

        {/* Desktop Collapse Arrow Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border-color bg-bg-card text-text-secondary shadow-md hover:bg-bg-hover hover:text-text-primary"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Dashboard' : ''}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-brand border-l-4 border-accent-secondary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <LayoutDashboard size={18} className="shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const hasActiveChild = group.items.some((item) => location.pathname === item.to);
            return (
              <div key={group.key} className="space-y-1">
                {/* Header title or collapsed icon */}
                {!collapsed ? (
                  <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted block">
                    {group.title}
                  </span>
                ) : (
                  <div className="border-t border-border-color/40 my-2 pt-2 flex justify-center">
                    <GroupIcon
                      size={16}
                      className={`text-text-muted ${hasActiveChild ? 'text-accent-primary' : ''}`}
                      title={group.title}
                    />
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items
                    .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                    .map((item) => renderLink(item, false))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Mobile Slide-in Drawer Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {mobileSidebarContent}
      </aside>

      {/* Desktop Persistent Container */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0">
        {desktopSidebarContent}
      </aside>
    </>
  );
}
