import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import {
  getLeaveApplications,
  getLeaveTypes,
  createLeaveType,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  getEmployees
} from '../../api/hrApi';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Balances state
  const [selectedEmpForBalance, setSelectedEmpForBalance] = useState('');
  const [balances, setBalances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [pendingOnly, setPendingOnly] = useState(false);

  // Form State - Leave Type
  const [typeName, setTypeName] = useState('');
  const [daysAllowed, setDaysAllowed] = useState('');

  // Form State - Reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectAppId, setRejectAppId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, pendingOnly]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'applications') {
        const res = await getLeaveApplications(pendingOnly ? 'Pending' : '');
        setApplications(res.applications || []);
      } else if (activeTab === 'types') {
        const res = await getLeaveTypes();
        setLeaveTypes(res.leaveTypes || []);
      } else if (activeTab === 'balances') {
        const empRes = await getEmployees();
        setEmployees(empRes.employees || []);
        if (selectedEmpForBalance) {
          const balRes = await getLeaveBalance(selectedEmpForBalance);
          setBalances(balRes.balances || []);
        } else {
          setBalances([]);
        }
      }
    } catch (err) {
      setError('Failed to fetch leave data.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmpBalanceChange = async (empId) => {
    setSelectedEmpForBalance(empId);
    if (!empId) {
      setBalances([]);
      return;
    }
    try {
      setLoading(true);
      const balRes = await getLeaveBalance(empId);
      setBalances(balRes.balances || []);
    } catch (err) {
      setError('Failed to fetch leave balance.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createLeaveType({ name: typeName, days_allowed_per_year: daysAllowed });
      setSuccess('Leave Type added successfully.');
      setTypeName('');
      setDaysAllowed('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create leave type.');
    }
  };

  const handleApprove = async (id) => {
    setError('');
    setSuccess('');
    try {
      await approveLeave(id);
      setSuccess('Leave application approved.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve leave.');
    }
  };

  const handleOpenReject = (id) => {
    setRejectAppId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await rejectLeave(rejectAppId, rejectReason);
      setSuccess('Leave application rejected.');
      setShowRejectModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject leave.');
    }
  };

  const calculateDays = (from, to) => {
    const f = new Date(from);
    const t = new Date(to);
    return Math.ceil(Math.abs(t - f) / (1000 * 60 * 60 * 24)) + 1;
  };

  const applicationColumns = [
    {
      key: 'employee_name',
      label: 'Employee',
      render: (app) => <span className="font-semibold text-text-primary">{app.employee_name}</span>
    },
    {
      key: 'leave_type_name',
      label: 'Leave Type',
      render: (app) => <span className="text-accent-primary font-medium">{app.leave_type_name}</span>
    },
    {
      key: 'from_date',
      label: 'From',
      render: (app) => <span className="tabular-nums text-text-secondary">{formatDate(app.from_date)}</span>
    },
    {
      key: 'to_date',
      label: 'To',
      render: (app) => <span className="tabular-nums text-text-secondary">{formatDate(app.to_date)}</span>
    },
    {
      key: 'days',
      label: 'Days',
      render: (app) => <span className="tabular-nums font-semibold text-text-primary text-center block">{calculateDays(app.from_date, app.to_date)}</span>
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (app) => <span className="text-text-muted italic max-w-xs truncate block" title={app.reason}>{app.reason}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (app) => <StatusBadge status={app.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (app) => (
        app.status === 'Pending' ? (
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={() => handleApprove(app.id)}
              className="btn-primary btn-xs"
            >
              Approve
            </button>
            <button
              onClick={() => handleOpenReject(app.id)}
              className="btn-secondary btn-xs text-[var(--danger-text)] hover:border-[var(--danger-border)]"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        )
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Leave Management"
        description="Review leave applications, manage leave allocation rules, and check remaining balances."
      />

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

      {/* Tabs */}
      <div className="flex border-b border-border-color pb-1 gap-1">
        {['applications', 'types', 'balances'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn-sm capitalize ${
              activeTab === tab 
                ? 'btn-primary' 
                : 'btn-ghost'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="sheet p-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="pending-only"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="pending-only" className="text-text-primary font-medium text-xs cursor-pointer">Show Pending Applications Only</label>
          </div>

          {applications.length === 0 && !loading ? (
            <EmptyState
              icon={FileText}
              title="No Leave Applications Found"
              description="There are currently no leave requests filed in the system matching your criteria."
            />
          ) : (
            <Table columns={applicationColumns} data={applications} loading={loading} emptyMessage="No leave applications found." />
          )}
        </div>
      )}

      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-text-muted text-sm">Loading leave types...</div>
            ) : leaveTypes.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No Leave Types Defined"
                  description="Create leave categories (e.g. Paid Leave, Sick Leave) to set annual quota balances."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="bom w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3">Leave Type Name</th>
                      <th className="p-3 text-right">Days Allowed Per Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color text-sm">
                    {leaveTypes.map((lt) => (
                      <tr key={lt.id} className="bom-row text-text-secondary">
                        <td className="p-3 font-semibold text-text-primary">{lt.name}</td>
                        <td className="p-3 text-right tabular-nums font-semibold text-accent-primary">{lt.days_allowed_per_year} Days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="sheet p-5 h-fit space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Create Leave Type</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Type Name *</label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="field"
                  placeholder="E.g., Sick Leave, Casual Leave"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Days Allowed Per Year *</label>
                <input
                  type="number"
                  value={daysAllowed}
                  onChange={(e) => setDaysAllowed(e.target.value)}
                  className="field tabular-nums"
                  placeholder="E.g., 12"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center"
              >
                Create Type
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="sheet p-3 flex items-center gap-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Employee:</label>
            <select
              value={selectedEmpForBalance}
              onChange={(e) => handleEmpBalanceChange(e.target.value)}
              className="field md:w-64"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.emp_code})</option>
              ))}
            </select>
          </div>

          <div className="sheet overflow-hidden">
            {!selectedEmpForBalance ? (
              <div className="p-8 text-center text-text-muted italic text-sm">Select an employee from the dropdown above to view leave balances.</div>
            ) : loading ? (
              <div className="p-8 text-center text-text-muted text-sm">Loading balances...</div>
            ) : balances.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No leave balances found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="bom w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3 text-center">Year</th>
                      <th className="p-3 text-center">Allocated Days</th>
                      <th className="p-3 text-center">Used Days</th>
                      <th className="p-3 text-center">Remaining Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color text-sm">
                    {balances.map((b) => (
                      <tr key={b.id} className="bom-row text-text-secondary">
                        <td className="p-3 font-semibold text-text-primary">{b.leave_type_name}</td>
                        <td className="p-3 text-center tabular-nums">{b.year}</td>
                        <td className="p-3 text-center tabular-nums">{b.total_days}</td>
                        <td className="p-3 text-center tabular-nums text-[var(--warning-text)] font-semibold">{b.used_days}</td>
                        <td className="p-3 text-center tabular-nums text-[var(--success-text)] font-semibold">{b.remaining_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Leave Application"
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Reason/Remark for Rejection *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="field h-24"
              placeholder="E.g., Operational requirements or insufficient staff coverage"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}