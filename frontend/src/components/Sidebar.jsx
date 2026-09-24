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
    title: 'System Admin',
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
    title: 'Sales & Commerce',
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
    title: 'Procurement',
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
    title: 'Inventory & Warehouse',
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
    title: 'Manufacturing Ops',
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
    title: 'Equipment & Plant',
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
    title: 'Quality Control Gating',
    permission: ['qc', 'view'],
    icon: Shield,
    items: [
      { label: 'Raw Material QC', to: '/qc/raw-material', permission: ['qc', 'view'], icon: Shield },
      { label: 'In-Process QC', to: '/qc/in-process', permission: ['qc', 'view'], icon: Shield },
      { label: 'Final QC', to: '/qc/final', permission: ['qc', 'view'], icon: Shield },
      { label: 'NCR Records', to: '/qc/ncr', permission: ['qc', 'view'], icon: Shield }
    ]
  },
  {
    key: 'dispatch',
    title: 'Logistics & Dispatch',
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
    title: 'Human Resources',
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
    title: 'Engineering & CAD',
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
          `group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-all duration-150 ${
            isActive
              ? 'bg-bg-card text-text-primary font-bold border-l-2 border-accent-primary shadow-2xs'
              : 'text-text-secondary hover:bg-bg-hover/80 hover:text-text-primary'
          }`
        }
      >
        <Icon size={15} className="shrink-0 text-text-muted transition-colors group-hover:text-text-primary" />
        {(!collapsed || isMobileView) && (
          <span className="flex-1 truncate tracking-tight">{item.label}</span>
        )}
        {item.alertBadge && alertCount > 0 && (
          <span className="rounded-xs bg-accent-danger/20 border border-accent-danger/40 px-1.5 py-0.2 text-[9px] font-mono font-bold text-accent-danger">
            {alertCount}
          </span>
        )}
      </NavLink>
    );
  };

  // 1. Mobile Sidebar Drawer
  const mobileSidebarContent = (
    <div className="flex h-full w-[250px] flex-col border-r border-border-color bg-bg-secondary text-text-primary">
      <div className="flex h-[54px] items-center justify-between border-b border-border-color px-4">
        <Logo size="sm" showText={true} />
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-text-secondary hover:bg-bg-hover hover:text-text-primary lg:hidden"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-bold transition-all duration-150 ${
              isActive
                ? 'bg-bg-card text-text-primary border-l-2 border-accent-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`
          }
        >
          <LayoutDashboard size={16} />
          <span>Operations Command</span>
        </NavLink>

        <div className="space-y-3 pt-2">
          {visibleGroups.map((group) => (
            <div key={group.key} className="space-y-1">
              <span className="px-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-text-muted block">
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

  // 2. Desktop Operations Rail Sidebar
  const desktopSidebarContent = (
    <div
      className={`relative flex h-full flex-col border-r border-border-color bg-bg-secondary text-text-primary transition-all duration-200 ease-in-out ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Console Brand Header */}
      <div className="flex h-[54px] items-center justify-between border-b border-border-color px-3">
        {!collapsed ? (
          <Logo size="sm" showText={true} />
        ) : (
          <Logo size="sm" showText={false} className="mx-auto" />
        )}

        {/* Collapse Arrow Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-3.5 z-30 flex h-5 w-5 items-center justify-center rounded-sm border border-border-color bg-bg-modal text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shadow-2xs"
          title={collapsed ? 'Expand operations rail' : 'Collapse rail'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Rail Nav Items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Operations Command Center' : ''}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs font-bold transition-all duration-150 ${
              isActive
                ? 'bg-bg-card text-text-primary border-l-2 border-accent-primary shadow-2xs'
                : 'text-text-secondary hover:bg-bg-hover/80 hover:text-text-primary'
            } ${collapsed ? 'justify-center px-0' : ''}`
          }
        >
          <LayoutDashboard size={16} className="shrink-0 text-accent-primary" />
          {!collapsed && <span className="tracking-tight">Command Center</span>}
        </NavLink>

        <div className="space-y-3 pt-1 border-t border-border-color/50">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const hasActiveChild = group.items.some((item) => location.pathname === item.to);
            const isExpanded = expandedGroups[group.key] ?? true;

            return (
              <div key={group.key} className="space-y-0.5">
                {/* Collapsible Domain Header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <GroupIcon size={12} className={hasActiveChild ? 'text-accent-primary' : 'text-text-muted'} />
                      <span className="truncate">{group.title}</span>
                    </div>
                    <ChevronDown
                      size={12}
                      className={`shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : (
                  <div className="flex justify-center py-1 border-t border-border-color/30">
                    <GroupIcon
                      size={14}
                      className={hasActiveChild ? 'text-accent-primary' : 'text-text-muted'}
                      title={group.title}
                    />
                  </div>
                )}

                {/* Sub-items */}
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
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-2xs lg:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {mobileSidebarContent}
      </aside>

      {/* Desktop Operations Rail */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0 select-none">
        {desktopSidebarContent}
      </aside>
    </>
  );
}
