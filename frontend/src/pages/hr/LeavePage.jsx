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
      render: (app) => <span className="font-mono text-xs text-text-secondary">{new Date(app.from_date).toLocaleDateString()}</span>
    },
    {
      key: 'to_date',
      label: 'To',
      render: (app) => <span className="font-mono text-xs text-text-secondary">{new Date(app.to_date).toLocaleDateString()}</span>
    },
    {
      key: 'days',
      label: 'Days',
      render: (app) => <span className="font-mono font-bold text-text-primary text-center block">{calculateDays(app.from_date, app.to_date)}</span>
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (app) => <span className="text-text-muted italic max-w-xs truncate block text-xs" title={app.reason}>{app.reason}</span>
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
              className="btn btn-success text-xs py-1 px-2.5"
            >
              Approve
            </button>
            <button
              onClick={() => handleOpenReject(app.id)}
              className="btn btn-danger text-xs py-1 px-2.5"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-text-muted text-xs font-mono">—</span>
        )
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Leave Management"
        description="Review leave applications, manage leave allocation rules, and inspect remaining balances."
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      {/* Tabs */}
      <div className="flex border-b border-border-color pb-1 gap-2">
        {['applications', 'types', 'balances'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 text-xs font-mono font-bold uppercase transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab 
                ? 'border-accent-primary text-accent-primary' 
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-bg-surface border border-border-color rounded-xs p-3 font-mono text-xs">
            <input
              type="checkbox"
              id="pending-only"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="rounded-xs border-border-color text-accent-primary"
            />
            <label htmlFor="pending-only" className="text-text-primary font-bold uppercase tracking-wider cursor-pointer">Show Pending Applications Only</label>
          </div>

          <div className="sheet">
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
        </div>
      )}

      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 min-w-0 sheet">
            {loading ? (
              <div className="p-8 text-center text-text-muted text-xs font-mono">Loading leave types...</div>
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-color bg-bg-surface text-text-muted font-mono font-bold uppercase tracking-wider">
                      <th className="p-3">Leave Type Name</th>
                      <th className="p-3 text-right">Days Allowed Per Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {leaveTypes.map((lt) => (
                      <tr key={lt.id} className="hover:bg-bg-hover text-text-secondary transition-colors">
                        <td className="p-3 font-semibold text-text-primary">{lt.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-accent-primary">{lt.days_allowed_per_year} Days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="sheet p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary border-b border-border-color pb-2">Create Leave Type</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Type Name *</label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="field w-full"
                  placeholder="E.g., Sick Leave, Casual Leave"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Days Allowed Per Year *</label>
                <input
                  type="number"
                  value={daysAllowed}
                  onChange={(e) => setDaysAllowed(e.target.value)}
                  className="field w-full font-mono"
                  placeholder="E.g., 12"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full text-xs"
              >
                Create Type
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-bg-surface border border-border-color rounded-xs p-3 font-mono text-xs">
            <label className="font-bold uppercase tracking-wider text-text-muted">Select Employee:</label>
            <select
              value={selectedEmpForBalance}
              onChange={(e) => handleEmpBalanceChange(e.target.value)}
              className="field text-xs py-1 px-2.5"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.emp_code})</option>
              ))}
            </select>
          </div>

          <div className="sheet">
            {!selectedEmpForBalance ? (
              <div className="p-8 text-center text-text-muted italic text-xs font-mono">Select an employee from the dropdown above to view leave balances.</div>
            ) : loading ? (
              <div className="p-8 text-center text-text-muted text-xs font-mono">Loading balances...</div>
            ) : balances.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-xs font-mono">No leave balances found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-color bg-bg-surface text-text-muted font-mono font-bold uppercase tracking-wider">
                      <th className="p-3">Leave Type</th>
                      <th className="p-3 text-center">Year</th>
                      <th className="p-3 text-center">Allocated Days</th>
                      <th className="p-3 text-center">Used Days</th>
                      <th className="p-3 text-center">Remaining Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color font-mono">
                    {balances.map((b) => (
                      <tr key={b.id} className="hover:bg-bg-hover text-text-secondary transition-colors">
                        <td className="p-3 font-semibold text-text-primary font-sans">{b.leave_type_name}</td>
                        <td className="p-3 text-center">{b.year}</td>
                        <td className="p-3 text-center">{b.total_days}</td>
                        <td className="p-3 text-center text-accent-warning font-semibold">{b.used_days}</td>
                        <td className="p-3 text-center text-accent-success font-bold">{b.remaining_days}</td>
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
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Provide Reason/Remark for Rejection *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="field w-full h-24 text-xs"
              placeholder="E.g., Operational requirements or insufficient staff coverage"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger text-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
