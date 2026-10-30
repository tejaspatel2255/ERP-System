import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import { useRole } from '../context/RoleContext';
import { getActivityLogs, getUsers } from '../api/userApi';
import PageHeader from '../components/PageHeader';
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
        const data = await getUsers({ page: 1, limit: 200 });
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

  // Handle Client-Side CSV Export
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
          <div className="font-semibold text-text-primary">{item.user_name || 'System'}</div>
          <div className="text-[11px] font-mono text-text-muted">{item.user_email || 'System Operation'}</div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (item) => (
        <span className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[11px] font-mono font-bold ${
          item.action.startsWith('CREATE')
            ? 'bg-accent-success/15 text-accent-success border border-accent-success/30'
            : item.action.startsWith('DELETE') || item.action.startsWith('DEACTIVATE')
            ? 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30'
            : 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
        }`}>
          {item.action}
        </span>
      )
    },
    { key: 'module', label: 'Module', render: (i) => <span className="font-mono text-xs uppercase">{i.module}</span> },
    { key: 'record_id', label: 'Record ID', render: (item) => <span className="font-mono text-xs text-text-muted">{item.record_id || 'N/A'}</span> },
    { key: 'ip_address', label: 'IP Address', render: (item) => <span className="font-mono text-xs text-text-muted">{item.ip_address || 'N/A'}</span> },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (item) => <span className="font-mono text-xs text-text-muted">{new Date(item.created_at).toLocaleString()}</span>
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="System Audit Logs"
        description="Real-time tracking of configurations, creations, edits, and administrative actions."
        actions={
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs font-mono"
          >
            Export to CSV
          </button>
        }
      />

      {/* Audit Logs Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sheet">
        {/* Module Filter */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
            Module Filter
          </label>
          <select
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
            className="field w-full text-xs font-mono"
          >
            <option value="">All Modules</option>
            {MODULES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
            Operator User
          </label>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
            className="field w-full text-xs"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="field w-full text-xs font-mono"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="field w-full text-xs font-mono"
          />
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="sheet">
        <Table columns={columns} data={logs} loading={loading} emptyMessage="No system audit logs found matching filters." />
      </div>

      {/* Pagination */}
      <div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default ActivityLogPage;
