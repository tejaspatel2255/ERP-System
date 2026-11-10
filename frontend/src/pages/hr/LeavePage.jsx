import React, { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  getLeaveApplications,
  getLeaveTypes,
  createLeaveType,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  getEmployees,
  getAttendance
} from '../../api/hrApi';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import {
  calculateEmployeeLeaves,
  formatLeaveDays,
  ANNUAL_LEAVE_QUOTA
} from '../../utils/leaveCalculator';

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);

  // Balances state
  const [selectedEmpForBalance, setSelectedEmpForBalance] = useState('');
  const [balances, setBalances] = useState([]);
  const [empAttendanceStats, setEmpAttendanceStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [pendingOnly, setPendingOnly] = useState(false);

  // Form State - Leave Type (Default 20 per requirement)
  const [typeName, setTypeName] = useState('');
  const [daysAllowed, setDaysAllowed] = useState('20');

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
        const [appRes, attRes] = await Promise.all([
          getLeaveApplications(pendingOnly ? 'Pending' : ''),
          getAttendance().catch(() => ({ attendance: [] }))
        ]);
        setApplications(appRes.applications || []);
        setAllAttendance(attRes.attendance || []);
      } else if (activeTab === 'types') {
        const res = await getLeaveTypes();
        setLeaveTypes(res.leaveTypes || []);
      } else if (activeTab === 'balances') {
        const [empRes, attRes] = await Promise.all([
          getEmployees(),
          getAttendance().catch(() => ({ attendance: [] }))
        ]);
        setEmployees(empRes.employees || []);
        setAllAttendance(attRes.attendance || []);

        if (selectedEmpForBalance) {
          await loadEmployeeBalance(selectedEmpForBalance, attRes.attendance || []);
        } else {
          setBalances([]);
          setEmpAttendanceStats(null);
        }
      }
    } catch (err) {
      setError('Failed to fetch leave data.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBalance = async (empId, attendanceList = allAttendance) => {
    try {
      const [balRes, empAttRes] = await Promise.all([
        getLeaveBalance(empId).catch(() => ({ balances: [] })),
        getAttendance(empId).catch(() => ({ attendance: [] }))
      ]);

      const records =
        empAttRes.attendance && empAttRes.attendance.length > 0
          ? empAttRes.attendance
          : attendanceList.filter((a) => a.employee_id === empId);

      const stats = calculateEmployeeLeaves(records, empId);
      setEmpAttendanceStats(stats);

      const backendBalances = balRes.balances || [];
      if (backendBalances.length > 0) {
        setBalances(backendBalances);
      } else {
        // Fallback default annual quota of 20
        setBalances([
          {
            id: 'standard-annual',
            leave_type_name: 'Standard Annual Leave',
            year: new Date().getFullYear(),
            total_days: ANNUAL_LEAVE_QUOTA,
            used_days: stats.attendanceUsed,
            remaining_days: stats.remaining
          }
        ]);
      }
    } catch {
      setError('Failed to load employee balance details.');
    }
  };

  const handleEmpBalanceChange = async (empId) => {
    setSelectedEmpForBalance(empId);
    if (!empId) {
      setBalances([]);
      setEmpAttendanceStats(null);
      return;
    }
    setLoading(true);
    await loadEmployeeBalance(empId);
    setLoading(false);
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createLeaveType({
        name: typeName,
        days_allowed_per_year: daysAllowed || 20
      });
      setSuccess('Leave Type added successfully.');
      setTypeName('');
      setDaysAllowed('20');
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
      render: (app) => (
        <div>
          <span className="font-semibold text-text-primary block">{app.employee_name}</span>
          <span className="text-[10px] text-text-muted font-mono">{app.emp_code}</span>
        </div>
      )
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
      render: (app) => (
        <span className="tabular-nums font-semibold text-text-primary text-center block">
          {calculateDays(app.from_date, app.to_date)}
        </span>
      )
    },
    {
      key: 'available_balance',
      label: 'Available Leave Balance',
      render: (app) => {
        const stats = calculateEmployeeLeaves(allAttendance, app.employee_id);
        const rem = stats.remaining;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
              rem > 10
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : rem > 3
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {formatLeaveDays(rem)} / 20 left
          </span>
        );
      }
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (app) => (
        <span className="text-text-muted italic max-w-xs truncate block" title={app.reason}>
          {app.reason}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (app) => <StatusBadge status={app.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (app) =>
        app.status === 'Pending' ? (
          <div className="flex gap-1.5 justify-center">
            <button onClick={() => handleApprove(app.id)} className="btn btn-primary btn-xs">
              Approve
            </button>
            <button
              onClick={() => handleOpenReject(app.id)}
              className="btn btn-secondary btn-xs text-[var(--danger-text)] hover:border-[var(--danger-border)]"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Leave Management"
        description="Review leave applications, manage leave allocation rules (Total Quota: 20 Days | L: -1.0 | H: -0.5), and check remaining balances."
      />

      {error && (
        <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-color pb-1 gap-1">
        {['applications', 'types', 'balances'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn btn-sm capitalize ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
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
            <label
              htmlFor="pending-only"
              className="text-text-primary font-medium text-xs cursor-pointer"
            >
              Show Pending Applications Only
            </label>
          </div>

          {applications.length === 0 && !loading ? (
            <EmptyState
              icon={FileText}
              title="No Leave Applications Found"
              description="There are currently no leave requests filed in the system matching your criteria."
            />
          ) : (
            <Table
              columns={applicationColumns}
              data={applications}
              loading={loading}
              emptyMessage="No leave applications found."
            />
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
                  description="Create leave categories (e.g. Paid Leave, Casual Leave) to set annual quota balances (Standard: 20 Days)."
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
                        <td className="p-3 text-right tabular-nums font-semibold text-accent-primary">
                          {lt.days_allowed_per_year} Days
                        </td>
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
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Type Name *
                </label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="field"
                  placeholder="E.g., Casual Leave, Sick Leave"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Days Allowed Per Year *
                </label>
                <input
                  type="number"
                  value={daysAllowed}
                  onChange={(e) => setDaysAllowed(e.target.value)}
                  className="field tabular-nums"
                  placeholder="20"
                  required
                />
                <p className="text-[11px] text-text-muted mt-1">Standard employee quota is 20 days per year.</p>
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center">
                Create Type
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="sheet p-3 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Select Employee:
            </label>
            <select
              value={selectedEmpForBalance}
              onChange={(e) => handleEmpBalanceChange(e.target.value)}
              className="field md:w-64"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.emp_code})
                </option>
              ))}
            </select>
          </div>

          {selectedEmpForBalance && empAttendanceStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sheet p-4 space-y-1">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Annual Total Leave Quota</p>
                <p className="text-2xl font-bold text-text-primary font-mono">
                  20 <span className="text-xs font-normal text-text-secondary">Days</span>
                </p>
                <p className="text-[11px] text-text-muted">Standard entitlement for calendar year</p>
              </div>

              <div className="sheet p-4 space-y-1 border-l-4 border-l-amber-500">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Leaves Deducted via Attendance</p>
                <p className="text-2xl font-bold text-amber-500 font-mono">
                  {formatLeaveDays(empAttendanceStats.attendanceUsed)}{' '}
                  <span className="text-xs font-normal text-text-secondary">Days</span>
                </p>
                <p className="text-[11px] text-text-muted">
                  {empAttendanceStats.leaveCount} Full Leaves (L: -1.0) • {empAttendanceStats.halfDayCount} Half Days (H: -0.5)
                </p>
              </div>

              <div className="sheet p-4 space-y-1 border-l-4 border-l-emerald-500 bg-bg-hover">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Net Available Leave Balance</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatLeaveDays(empAttendanceStats.remaining)}{' '}
                  <span className="text-xs font-normal text-text-secondary">/ 20 Days</span>
                </p>
                <p className="text-[11px] text-text-muted">Available for remaining year</p>
              </div>
            </div>
          )}

          <div className="sheet overflow-hidden">
            {!selectedEmpForBalance ? (
              <div className="p-8 text-center text-text-muted italic text-sm">
                Select an employee from the dropdown above to view leave balances and attendance deductions.
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-text-muted text-sm">Loading balances...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="bom w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3 text-center">Year</th>
                      <th className="p-3 text-center">Annual Quota</th>
                      <th className="p-3 text-center">Attendance Used (L & H)</th>
                      <th className="p-3 text-center">Remaining Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color text-sm">
                    {balances.map((b) => {
                      const quota = ANNUAL_LEAVE_QUOTA;
                      const used = empAttendanceStats ? empAttendanceStats.attendanceUsed : b.used_days;
                      const remaining = empAttendanceStats ? empAttendanceStats.remaining : Math.max(0, quota - used);

                      return (
                        <tr key={b.id} className="bom-row text-text-secondary">
                          <td className="p-3 font-semibold text-text-primary">{b.leave_type_name}</td>
                          <td className="p-3 text-center tabular-nums">{b.year}</td>
                          <td className="p-3 text-center tabular-nums font-mono font-semibold text-text-primary">
                            {quota} Days
                          </td>
                          <td className="p-3 text-center tabular-nums font-mono text-amber-500 font-semibold">
                            {formatLeaveDays(used)} Days
                            {empAttendanceStats && (
                              <span className="block text-[10px] text-text-muted font-normal">
                                ({empAttendanceStats.leaveCount} L + {empAttendanceStats.halfDayCount} H)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center tabular-nums font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatLeaveDays(remaining)} / {quota} Days
                          </td>
                        </tr>
                      );
                    })}
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Reason/Remark for Rejection *
            </label>
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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
