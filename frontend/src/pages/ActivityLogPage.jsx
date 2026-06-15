import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import { useRole } from '../context/RoleContext';
import { getActivityLogs, getUsers } from '../api/userApi';
import { exportToCSV } from '../utils/exportCSV';

// Exact list of modules to filter by
const MODULES = [
  { key: 'auth', label: 'Auth & Roles' },
  { key: 'users', label: 'Users Management' },
  { key: 'departments', label: 'Departments' },
  { key: 'roles', label: 'Roles' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'inventory', label: 'Store / Inventory' },
  { key: 'production', label: 'Production' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'qa', label: 'Quality Assurance' },
  { key: 'qc', label: 'Quality Control' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'design', label: 'Design Files' }
];

const ActivityLogPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination State
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Activity Logs list
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        module: selectedModule,
        userId: selectedUser,
        startDate,
        endDate,
        page,
        limit: 50
      };
      const data = await getActivityLogs(filters);
      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load system activity logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedModule, selectedUser, startDate, endDate, page]);

  // Fetch Users metadata for dropdown filter
  useEffect(() => {
    const fetchUsersMetadata = async () => {
      try {
        const data = await getUsers({ page: 1, limit: 200 }); // load all users for selector
        if (data.success) {
          setUsers(data.users);
        }
      } catch (err) {
        console.error('Failed to load user list for logs filtering');
      }
    };

    if (hasPermission('auth', 'view')) {
      fetchUsersMetadata();
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Client-Side CSV Export (zero dependencies required)
  const handleExportCSV = () => {
    if (logs.length === 0) {
      return toast.error('No logs available to export.');
    }

    exportToCSV(logs.map((log) => ({
      User: log.user_name || 'System',
      Email: log.user_email || 'N/A',
      Action: log.action,
      Module: log.module,
      'Record ID': log.record_id || '',
      'IP Address': log.ip_address || '',
      Time: new Date(log.created_at).toLocaleString()
    })), `system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Activity logs exported successfully.');
  };

  // Columns for the logs table
  const columns = [
    {
      key: 'user_name',
      label: 'User',
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{item.user_name || 'System'}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{item.user_email || 'System Operation'}</div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (item) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
          item.action.startsWith('CREATE')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800'
            : item.action.startsWith('DELETE') || item.action.startsWith('DEACTIVATE')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800'
        }`}>
          {item.action}
        </span>
      )
    },
    { key: 'module', label: 'Module' },
    { key: 'record_id', label: 'Record ID', render: (item) => item.record_id || 'N/A' },
    { key: 'ip_address', label: 'IP Address', render: (item) => item.ip_address || 'N/A' },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (item) => new Date(item.created_at).toLocaleString()
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            System Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking of configurations, creations, edits, and administrative actions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {/* Download Icon */}
          <svg className="mr-2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export to CSV
        </button>
      </div>

      {/* Audit Logs Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Module Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Module Filter
          </label>
          <select
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Modules</option>
            {MODULES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Operator User
          </label>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Logs Table */}
      <Table columns={columns} data={logs} loading={loading} emptyMessage="No system audit logs found matching filters." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default ActivityLogPage;
