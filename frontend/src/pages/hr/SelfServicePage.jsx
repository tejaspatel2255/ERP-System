import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calendar, Clock, UserCheck } from 'lucide-react';
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
        getSelfAttendance(),
        getSelfLeaveBalance(),
        getSelfLeaveApplications(),
        getLeaveTypes()
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
                <Link
                  to="/hr"
                  className="btn-primary inline-flex items-center gap-2"
                >
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
        <p className="text-text-secondary text-sm mt-1">Apply for leaves, view holiday quotas, and check monthly attendance logs.</p>
      </div>

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

      {/* Leave Quota Cards */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">My Leave Quotas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map(b => (
            <div key={b.id} className="kpi-card space-y-2">
              <p className="kpi-label">{b.leave_type_name}</p>
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {b.remaining_days} <span className="text-xs font-normal text-text-muted">/ {b.total_days} days left</span>
              </p>
              <div className="progress">
                <span 
                  style={{ width: `${Math.min((b.remaining_days / (b.total_days || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {balances.length === 0 && (
            <p className="text-text-muted text-sm italic col-span-4 sheet p-4 text-center">No leave balances found for current year.</p>
          )}
        </div>
      </div>

      {/* Form and Applications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apply Form */}
        <div className="sheet p-5 h-fit space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Calendar size={16} className="text-accent-primary" />
            Apply for Leave
          </h3>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Leave Type *</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="field text-xs"
                required
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">From Date *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="field text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">To Date *</label>
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
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Reason / Remarks *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field text-xs h-20"
                placeholder="Provide details about leave application"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center"
            >
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
              <p className="text-text-muted text-xs italic text-center py-8">No previous leave applications submitted.</p>
            ) : (
              applications.map(app => (
                <div key={app.id} className="p-3 bg-bg-subtle border border-border-color rounded flex justify-between items-center text-xs">
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
        <h3 className="text-sm font-semibold text-text-primary">Clock Logs (Current Month)</h3>
        {attendance.length === 0 ? (
          <p className="text-text-muted text-xs italic text-center py-6">No attendance logs found for this month.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {attendance.map(att => (
              <div key={att.id} className="p-3 bg-bg-subtle border border-border-color rounded text-center space-y-1.5">
                <p className="text-xs text-text-muted tabular-nums">{new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                <div>
                  <StatusBadge status={att.status} />
                </div>
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