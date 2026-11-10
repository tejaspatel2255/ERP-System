import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calendar, Clock, UserCheck, CheckCircle2 } from 'lucide-react';
import {
  getSelfAttendance,
  getSelfLeaveBalance,
  selfApplyLeave,
  getSelfLeaveApplications,
  getLeaveTypes
} from '../../api/hrApi';
import { useRole } from '../../context/RoleContext';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import {
  calculateEmployeeLeaves,
  formatLeaveDays,
  ANNUAL_LEAVE_QUOTA
} from '../../utils/leaveCalculator';

export default function SelfServicePage() {
  const { hasPermission, isAdmin } = useRole();
  const canManageHR = isAdmin || hasPermission('hr', 'edit') || hasPermission('hr', 'view');

  const [attendance, setAttendance] = useState([]);
  const [balances, setBalances] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinked, setUnlinked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setUnlinked(false);
      setError('');

      const [attRes, balRes, appRes, typesRes] = await Promise.all([
        getSelfAttendance().catch(() => ({ attendance: [] })),
        getSelfLeaveBalance().catch(() => ({ balances: [] })),
        getSelfLeaveApplications().catch(() => ({ applications: [] })),
        getLeaveTypes().catch(() => ({ leaveTypes: [] }))
      ]);
      setAttendance(attRes.attendance || []);
      setBalances(balRes.balances || []);
      setApplications(appRes.applications || []);
      setLeaveTypes(typesRes.leaveTypes || []);
    } catch (err) {
      if (err.response?.data?.message === 'Employee profile not linked.') {
        setUnlinked(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load self-service profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute live leave stats based on attendance logs (Quota: 20 | L: -1.0 | H: -0.5)
  const leaveStats = useMemo(() => {
    return calculateEmployeeLeaves(attendance);
  }, [attendance]);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const today = new Date().toISOString().slice(0, 10);
    if (fromDate < today) {
      setError('Leave start date cannot be in the past.');
      return;
    }
    if (toDate < fromDate) {
      setError('To Date must be after or equal to From Date.');
      return;
    }

    try {
      await selfApplyLeave({
        leave_type_id: leaveTypeId,
        from_date: fromDate,
        to_date: toDate,
        reason
      });
      setSuccess('Leave application submitted successfully.');
      setLeaveTypeId('');
      setFromDate('');
      setToDate('');
      setReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave application.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading employee profile...</div>;
  }

  if (unlinked) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn py-6">
        <div className="sheet p-8 text-center space-y-4 max-w-2xl mx-auto border-[var(--warning-border)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-text)]">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Employee Profile Not Linked</h3>

          {canManageHR ? (
            <>
              <p className="text-sm text-text-secondary leading-relaxed">
                Your logged-in user account is not currently linked to an Employee record in the HR module. As an Admin/HR manager, you can link your account to an existing profile or create a new one.
              </p>
              <div className="pt-2">
                <Link to="/hr/employees" className="btn btn-primary inline-flex items-center gap-2">
                  <UserCheck size={16} />
                  Go to Employee Directory to Link Profile
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-secondary leading-relaxed">
              Your employee profile hasn't been set up or linked to your user account yet. Please contact your HR administrator to link your profile so you can apply for leaves and view attendance.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Employee Self-Service Portal</h2>
        <p className="text-text-secondary text-sm mt-1">
          Apply for leaves, track annual quotas (Total: 20 Days | L: -1.0 | H: -0.5), and check clock logs.
        </p>
      </div>

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

      {/* Leave Quota Cards */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-text-primary">My Annual Leave Entitlement</h3>
          <span className="text-xs text-text-muted">
            Rule: Full Leave (L) = -1.0 d • Half Day (H) = -0.5 d
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main Card: Annual Quota & Remaining */}
          <div className="sheet p-4 space-y-2 border-l-4 border-l-accent-primary">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Annual Leave Balance</p>
                <p className="text-2xl font-bold text-text-primary mt-1 font-mono">
                  {formatLeaveDays(leaveStats.remaining)}{' '}
                  <span className="text-xs font-normal text-text-muted">/ 20 days left</span>
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                  leaveStats.remaining > 10
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : leaveStats.remaining > 4
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                {((leaveStats.remaining / 20) * 100).toFixed(0)}% available
              </span>
            </div>
            <div className="progress h-2 bg-bg-hover rounded-full overflow-hidden">
              <span
                className="h-full rounded-full bg-accent-primary transition-all duration-300"
                style={{ width: `${Math.min((leaveStats.remaining / 20) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Leaves Deducted via Attendance */}
          <div className="sheet p-4 space-y-1 border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Attendance Deductions</p>
            <p className="text-2xl font-bold text-amber-500 font-mono mt-1">
              {formatLeaveDays(leaveStats.attendanceUsed)}{' '}
              <span className="text-xs font-normal text-text-muted">days used</span>
            </p>
            <p className="text-xs text-text-secondary pt-1">
              {leaveStats.leaveCount} Full Leaves (L: -1.0) • {leaveStats.halfDayCount} Half Days (H: -0.5)
            </p>
          </div>

          {/* Standard Total Quota */}
          <div className="sheet p-4 space-y-1 border-l-4 border-l-emerald-500">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Entitlement</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              20 <span className="text-xs font-normal text-text-muted">days / year</span>
            </p>
            <p className="text-xs text-text-secondary pt-1">
              Standard calendar year quota refreshed annually.
            </p>
          </div>
        </div>
      </div>

      {/* Form and Applications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apply Form */}
        <div className="sheet p-5 h-fit space-y-4">
          <div className="flex justify-between items-center border-b border-border-color pb-2.5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Calendar size={16} className="text-accent-primary" />
              Apply for Leave
            </h3>
            <span className="text-xs font-mono font-bold text-accent-primary">
              Bal: {formatLeaveDays(leaveStats.remaining)} / 20 d
            </span>
          </div>

          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Leave Type *
              </label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="field text-xs"
                required
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  From Date *
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="field text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  To Date *
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="field text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Reason / Remarks *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field text-xs h-20"
                placeholder="Provide reason for leave"
                required
              />
            </div>

            <div className="p-2.5 rounded bg-bg-subtle text-[11px] text-text-muted leading-relaxed">
              💡 <strong>Leave Policy:</strong> Annual quota is 20 days. Attendance logs marked with <strong>L</strong> deduct 1.0 day; <strong>H</strong> deduct 0.5 day from your remaining balance.
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center">
              Submit Leave Request
            </button>
          </form>
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2 sheet p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Clock size={16} className="text-accent-primary" />
            My Leave Application History
          </h3>
          <div className="overflow-y-auto max-h-[350px] space-y-2.5">
            {applications.length === 0 ? (
              <p className="text-text-muted text-xs italic text-center py-8">
                No previous leave applications submitted.
              </p>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="p-3 bg-bg-subtle border border-border-color rounded flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-semibold text-text-primary">{app.leave_type_name}</p>
                    <p className="text-text-secondary mt-0.5 tabular-nums">
                      {formatDate(app.from_date)} to {formatDate(app.to_date)}
                    </p>
                    <p className="text-text-muted text-xs italic mt-0.5">{app.reason}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge status={app.status} />
                    {app.approver_name && (
                      <p className="text-[11px] text-text-muted">Reviewer: {app.approver_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Attendance logs list */}
      <div className="sheet p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-text-primary">Clock Logs (Current Month)</h3>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Leave = -1.0 Leave</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Half Day = -0.5 Leave</span>
            </span>
          </div>
        </div>

        {attendance.length === 0 ? (
          <p className="text-text-muted text-xs italic text-center py-6">
            No attendance logs found for this month.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {attendance.map((att) => (
              <div
                key={att.id}
                className={`p-3 bg-bg-subtle border rounded text-center space-y-1.5 ${
                  att.status === 'Leave'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : att.status === 'Half Day'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border-color'
                }`}
              >
                <p className="text-xs text-text-muted tabular-nums">
                  {new Date(att.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                <div>
                  <StatusBadge status={att.status} />
                </div>
                {att.status === 'Leave' && (
                  <p className="text-[11px] font-semibold text-rose-500 font-mono">-1.0 Leave</p>
                )}
                {att.status === 'Half Day' && (
                  <p className="text-[11px] font-semibold text-amber-500 font-mono">-0.5 Leave</p>
                )}
                {(att.check_in || att.check_out) && (
                  <p className="text-xs font-mono text-text-muted mt-1 tabular-nums">
                    {att.check_in?.slice(0, 5) || '—'} - {att.check_out?.slice(0, 5) || '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
