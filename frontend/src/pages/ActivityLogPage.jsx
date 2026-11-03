import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { useRole } from '../context/RoleContext';
import { getActivityLogs, getUsers } from '../api/userApi';
import PageHeader from '../components/PageHeader';
import { exportToCSV } from '../utils/exportCSV';
import { Download } from 'lucide-react';

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
          <div className="font-medium text-text-primary">{item.user_name || 'System'}</div>
          <div className="text-xs font-mono text-text-muted">{item.user_email || 'System Operation'}</div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (item) => <StatusBadge status={item.action} />
    },
    { key: 'module', label: 'Module', render: (item) => <span className="capitalize font-medium text-text-secondary">{item.module}</span> },
    { key: 'record_id', label: 'Record ID', render: (item) => <span className="font-mono text-xs">{item.record_id || 'N/A'}</span> },
    { key: 'ip_address', label: 'IP Address', render: (item) => <span className="font-mono text-xs text-text-muted">{item.ip_address || 'N/A'}</span> },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (item) => <span className="font-mono text-xs tabular-nums text-text-secondary">{new Date(item.created_at).toLocaleString()}</span>
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="System Audit Logs"
        description="Real-time tracking of configurations, creations, edits, and administrative actions."
        actions={
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export to CSV
          </button>
        }
      />

      {/* Audit Logs Filter Toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        {/* Module Filter */}
        <div className="w-48">
          <label className="field-label block mb-1">
            Module Filter
          </label>
          <select
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All Modules</option>
            {MODULES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div className="w-48">
          <label className="field-label block mb-1">
            Operator User
          </label>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="w-40">
          <label className="field-label block mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="field font-mono"
          />
        </div>

        {/* End Date */}
        <div className="w-40">
          <label className="field-label block mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="field font-mono"
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
