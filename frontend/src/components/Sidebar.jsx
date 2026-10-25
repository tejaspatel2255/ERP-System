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

const ZONE_MAP = {
  admin: 'Z00',
  sales: 'Z01',
  purchase: 'Z02',
  store: 'Z03',
  production: 'Z04',
  maintenance: 'Z05',
  qa: 'Z06',
  qc: 'Z07',
  dispatch: 'Z08',
  hr: 'Z09',
  design: 'Z10'
};

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
          `group relative flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150 ${
            isActive
              ? 'bg-bg-card text-text-primary font-bold border-l-[3px] border-accent-primary shadow-2xs'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-[3px] border-transparent hover:border-accent-primary/40'
          } ${collapsed && !isMobileView ? 'justify-center px-0' : ''}`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              size={16}
              className={`shrink-0 transition-colors ${
                isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-primary'
              }`}
            />
            {(!collapsed || isMobileView) && (
              <span className="flex-1 truncate tracking-tight">{item.label}</span>
            )}
            {item.alertBadge && alertCount > 0 && (!collapsed || isMobileView) && (
              <span
                className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-1.5 py-0.2 border"
                style={{
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  borderColor: 'var(--danger-border)'
                }}
              >
                <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '6px', height: '6px' }} />
                <span>{alertCount}</span>
              </span>
            )}
            {isActive && (!collapsed || isMobileView) && (
              <span className="lamp shrink-0" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
            )}
          </>
        )}
      </NavLink>
    );
  };

  // 1. Mobile Sidebar Drawer
  const mobileSidebarContent = (
    <div className="flex h-full w-[270px] flex-col border-r border-border-strong bg-bg-secondary text-text-primary">
      <div className="flex h-[60px] items-center justify-between border-b border-border-strong px-4">
        <Logo size="sm" showText={true} />
        <button
          onClick={onClose}
          className="btn btn-ghost btn-icon btn-sm lg:hidden"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 px-3 py-2 text-sm font-display uppercase tracking-wider font-bold transition-all duration-150 ${
              isActive
                ? 'bg-bg-card text-text-primary border-l-[3px] border-accent-primary shadow-2xs'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-[3px] border-transparent'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard size={18} className={`shrink-0 ${isActive ? 'text-accent-primary' : 'text-text-muted'}`} />
              <span className="flex-1 truncate tracking-tight">Operations Command</span>
              {isActive && (
                <span className="lamp shrink-0" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
              )}
            </>
          )}
        </NavLink>

        <div className="space-y-3 pt-2">
          {visibleGroups.map((group) => {
            const zoneCode = ZONE_MAP[group.key] || 'Z00';
            return (
              <div key={group.key} className="space-y-1">
                <div className="dim-line my-1.5 opacity-40" />
                <div className="px-3 flex items-center gap-1.5 py-0.5">
                  <span className="sheet-tag text-[10px] text-accent-primary font-bold">{zoneCode}</span>
                  <span className="font-display uppercase tracking-wider text-xs text-text-muted font-bold block">
                    {group.title}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items
                    .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                    .map((item) => renderLink(item, true))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // 2. Desktop Operations Rail Sidebar
  const desktopSidebarContent = (
    <div
      className={`relative flex h-full flex-col border-r border-border-strong bg-bg-secondary text-text-primary transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Console Brand Header */}
      <div className="flex h-[60px] items-center justify-between border-b border-border-strong px-3.5">
        {!collapsed ? (
          <Logo size="sm" showText={true} />
        ) : (
          <Logo size="sm" showText={false} className="mx-auto" />
        )}

        {/* Collapse Arrow Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 z-30 flex h-6 w-6 items-center justify-center border border-border-strong bg-bg-modal text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shadow-2xs"
          title={collapsed ? 'Expand operations rail' : 'Collapse rail'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Rail Nav Items */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2">
        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Operations Command Center' : ''}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 px-3 py-2 text-sm font-display uppercase tracking-wider font-bold transition-all duration-150 ${
              isActive
                ? 'bg-bg-card text-text-primary border-l-[3px] border-accent-primary shadow-2xs'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-[3px] border-transparent hover:border-accent-primary/40'
            } ${collapsed ? 'justify-center px-0' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard size={18} className={`shrink-0 ${isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
              {!collapsed && <span className="flex-1 truncate tracking-tight">Command Center</span>}
              {isActive && !collapsed && (
                <span className="lamp shrink-0" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
              )}
            </>
          )}
        </NavLink>

        <div className="space-y-2 pt-1 border-t border-border-color/50">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const hasActiveChild = group.items.some((item) => location.pathname === item.to);
            const isExpanded = expandedGroups[group.key] ?? true;
            const zoneCode = ZONE_MAP[group.key] || 'Z00';

            return (
              <div key={group.key} className="space-y-0.5">
                <div className="dim-line my-1.5 opacity-40" />
                {/* Collapsible Domain Header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-3 py-1 text-left hover:text-text-primary transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="sheet-tag text-[10px] text-accent-primary font-bold">{zoneCode}</span>
                      <span className="font-display uppercase tracking-wider text-sm text-text-muted group-hover:text-text-primary truncate">
                        {group.title}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-text-muted transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : (
                  <div className="flex justify-center py-1" title={`${zoneCode} — ${group.title}`}>
                    <span className="sheet-tag text-[10px] font-bold text-accent-primary">
                      {zoneCode}
                    </span>
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
          className="fixed inset-0 z-40 bg-[#07111F]/70 backdrop-blur-[2px] lg:hidden transition-opacity duration-200"
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
