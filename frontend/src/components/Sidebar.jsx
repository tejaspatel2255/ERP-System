import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { getStockAlerts } from '../api/storeApi';

const navClass = ({ isActive }) =>
  `block rounded-xl px-3 py-2 text-sm transition ${
    isActive ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

const groups = [
  { key: 'admin', title: 'Admin', permission: ['auth', 'view'], items: [
    { label: 'Users', to: '/users', permission: ['auth', 'view'] },
    { label: 'Roles', to: '/roles', permission: ['auth', 'view'] },
    { label: 'Activity Logs', to: '/activity-logs', permission: ['auth', 'view'] }
  ] },
  { key: 'sales', title: 'Sales', permission: ['sales', 'view'], items: [
    { label: 'Customers', to: '/sales/customers', permission: ['sales', 'view'] },
    { label: 'Quotations', to: '/sales/quotations', permission: ['sales', 'view'] },
    { label: 'Orders', to: '/sales/orders', permission: ['sales', 'view'] },
    { label: 'Invoices', to: '/sales/invoices', permission: ['sales', 'view'] },
    { label: 'Reports', to: '/sales/reports', permission: ['sales', 'view'] }
  ] },
  { key: 'purchase', title: 'Purchase', permission: ['purchase', 'view'], items: [
    { label: 'Vendors', to: '/purchase/vendors', permission: ['purchase', 'view'] },
    { label: 'Purchase Orders', to: '/purchase/orders', permission: ['purchase', 'view'] },
    { label: 'Vendor Invoices', to: '/purchase/invoices', permission: ['purchase', 'view'] },
    { label: 'Analytics', to: '/purchase/analytics', permission: ['purchase', 'view'] }
  ] },
  { key: 'store', title: 'Store', permission: ['store', 'view'], items: [
    { label: 'Items', to: '/store/items', permission: ['store', 'view'] },
    { label: 'GRN', to: '/store/grn', permission: ['store', 'view'] },
    { label: 'Stock Issue', to: '/store/issue', permission: ['store', 'view'] },
    { label: 'Stock Ledger', to: '/store/ledger', permission: ['store', 'view'] },
    { label: 'Alerts', to: '/store/alerts', permission: ['store', 'view'], alertBadge: true }
  ] },
  { key: 'production', title: 'Production', permission: ['production', 'view'], items: [
    { label: 'Bill of Materials', to: '/production/bom', permission: ['production', 'view'] },
    { label: 'Work Orders', to: '/production/work-orders', permission: ['production', 'view'] },
    { label: 'Schedule', to: '/production/schedule', permission: ['production', 'view'] }
  ] },
  { key: 'maintenance', title: 'Maintenance', permission: ['maintenance', 'view'], items: [
    { label: 'Assets', to: '/maintenance/assets', permission: ['maintenance', 'view'] },
    { label: 'Schedules', to: '/maintenance/schedules', permission: ['maintenance', 'view'] },
    { label: 'Issues', to: '/maintenance/issues', permission: ['maintenance', 'view'] }
  ] },
  { key: 'qa', title: 'Quality Assurance', permission: ['qa', 'view'], items: [
    { label: 'Checklists', to: '/qa/checklists', permission: ['qa', 'view'] },
    { label: 'QA Tests', to: '/qa/tests', permission: ['qa', 'view'] }
  ] },
  { key: 'qc', title: 'Quality Control', permission: ['qc', 'view'], items: [
    { label: 'Raw Material QC', to: '/qc/raw-material', permission: ['qc', 'view'] },
    { label: 'In-Process QC', to: '/qc/in-process', permission: ['qc', 'view'] },
    { label: 'Final QC', to: '/qc/final', permission: ['qc', 'view'] },
    { label: 'NCR', to: '/qc/ncr', permission: ['qc', 'view'] }
  ] },
  { key: 'dispatch', title: 'Dispatch', permission: ['dispatch', 'view'], items: [
    { label: 'Packing Slips', to: '/dispatch/packing-slips', permission: ['dispatch', 'view'] },
    { label: 'Delivery Challans', to: '/dispatch/challans', permission: ['dispatch', 'view'] },
    { label: 'Schedule', to: '/dispatch/schedule', permission: ['dispatch', 'view'] }
  ] },
  { key: 'hr', title: 'HR', permission: ['hr', 'view'], items: [
    { label: 'Employees', to: '/hr/employees', permission: ['hr', 'view'] },
    { label: 'Attendance', to: '/hr/attendance', permission: ['hr', 'view'] },
    { label: 'Leave', to: '/hr/leave', permission: ['hr', 'view'] },
    { label: 'Self Service', to: '/hr/self-service', permission: ['hr', 'view'] },
    { label: 'Training', to: '/hr/training', permission: ['hr', 'view'] }
  ] },
  { key: 'design', title: 'Design', permission: ['design', 'view'], items: [
    { label: 'Design Files', to: '/design/files', permission: ['design', 'view'] },
    { label: 'Tasks', to: '/design/tasks', permission: ['design', 'view'] },
    { label: 'Reviews', to: '/design/reviews', permission: ['design', 'view'] }
  ] }
];

export default function Sidebar({ open, onClose }) {
  const { hasPermission, isAdmin } = useRole();
  const [expanded, setExpanded] = useState({
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

  React.useEffect(() => {
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

  const visibleGroups = useMemo(() => groups.filter((group) => (
    isAdmin || hasPermission(group.permission[0], group.permission[1])
  )), [hasPermission, isAdmin]);

  const sidebarContent = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950/95">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="text-lg font-black tracking-wide text-white">ERP Control</div>
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Unified operations</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink to="/" className={navClass} onClick={onClose}>🏠 Dashboard</NavLink>
        <div className="mt-3 space-y-2">
          {visibleGroups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-slate-800/80 bg-slate-900/60">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-200"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
              >
                <span>{group.title}</span>
                <span className="text-slate-500">{expanded[group.key] ? '−' : '+'}</span>
              </button>
              {expanded[group.key] && (
                <div className="space-y-1 px-2 pb-3">
                  {group.items
                    .filter((item) => isAdmin || hasPermission(item.permission[0], item.permission[1]))
                    .map((item) => (
                      <NavLink key={item.to} to={item.to} className={navClass} onClick={onClose}>
                        <span className="flex items-center justify-between gap-2">
                          <span>{item.label}</span>
                          {item.alertBadge && alertCount > 0 && (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {alertCount}
                            </span>
                          )}
                        </span>
                      </NavLink>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-slate-950/70 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
