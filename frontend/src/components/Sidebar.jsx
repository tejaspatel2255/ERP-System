import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { getStockAlerts } from '../api/storeApi';
import Logo from './Logo';
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
  ChevronRight,
  ChevronDown
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
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={isMobileView ? onClose : undefined}
        title={collapsed && !isMobileView ? item.label : ''}
        className={({ isActive }) =>
          `nav-item ${isActive ? 'is-active' : ''} ${collapsed && !isMobileView ? 'justify-center px-0' : ''}`
        }
      >
        <Icon size={17} className="shrink-0" />
        {(!collapsed || isMobileView) && (
          <span className="flex-1 truncate">{item.label}</span>
        )}
        {item.alertBadge && alertCount > 0 && (!collapsed || isMobileView) && (
          <span className="ml-auto rounded-full bg-[var(--accent-danger)] text-white text-[11px] font-semibold px-1.5 min-w-[18px] text-center leading-tight">
            {alertCount}
          </span>
        )}
      </NavLink>
    );
  };

  // 1. Mobile Sidebar Render (256px drawer slide-in)
  const mobileSidebarContent = (
    <div className="flex h-full w-[256px] flex-col shell-bg border-r border-[var(--shell-border)]">
      <div className="flex h-[60px] items-center justify-between border-b border-[var(--shell-border)] px-4">
        <Logo size="sm" showText={true} onDark={true} />
        <button
          onClick={onClose}
          className="nav-item p-1.5 text-[var(--shell-text)] hover:text-[var(--shell-text-strong)] lg:hidden"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'is-active' : ''}`
          }
        >
          <LayoutDashboard size={17} className="shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroups[group.key] !== false;
            return (
              <div key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-2 py-1 text-left"
                >
                  <span className="nav-group-title">{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`text-[var(--shell-muted)] transition-transform duration-150 ${
                      isExpanded ? '' : '-rotate-90'
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="space-y-0.5">
                    {group.items
                      .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                      .map((item) => renderLink(item, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // 2. Desktop Sidebar Render (68px collapsed to 256px expanded)
  const desktopSidebarContent = (
    <div
      className={`relative flex h-full flex-col shell-bg border-r border-[var(--shell-border)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[256px]'
      }`}
    >
      {/* Top Header 60px */}
      <div className="flex h-[60px] items-center justify-between border-b border-[var(--shell-border)] px-3.5">
        {!collapsed ? (
          <Logo size="sm" showText={true} onDark={true} />
        ) : (
          <Logo size="sm" showText={false} onDark={true} className="mx-auto" />
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Dashboard' : ''}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'is-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
          }
        >
          <LayoutDashboard size={17} className="shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[group.key] !== false;
            return (
              <div key={group.key} className="space-y-1">
                {/* Header title or collapsed icon */}
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-2 py-1 text-left"
                  >
                    <span className="nav-group-title">{group.title}</span>
                    <ChevronDown
                      size={14}
                      className={`text-[var(--shell-muted)] transition-transform duration-150 ${
                        isExpanded ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="border-t border-[var(--shell-border)] my-2 pt-2 flex justify-center">
                    <GroupIcon
                      size={16}
                      className="text-[var(--shell-muted)]"
                      title={group.title}
                    />
                  </div>
                )}

                {(!collapsed ? isExpanded : true) && (
                  <div className="space-y-0.5">
                    {group.items
                      .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                      .map((item) => renderLink(item, false))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapse button at bottom */}
      <div className="border-t border-[var(--shell-border)] p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed && <span className="text-xs">Collapse sidebar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden"
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
