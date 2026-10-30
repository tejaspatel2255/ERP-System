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
    return <div className="p-8 text-center text-text-muted text-xs font-mono">Loading employee profile...</div>;
  }

  if (unlinked) {
    return (
      <div className="space-y-6 py-6 font-sans">
        <div className="sheet p-8 text-center space-y-4 max-w-2xl mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xs bg-accent-warning/20 text-accent-warning border border-accent-warning/30">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-mono font-bold uppercase tracking-wider text-text-primary">Employee Profile Not Linked</h3>
          
          {canManageHR ? (
            <>
              <p className="text-xs text-text-secondary leading-relaxed font-sans">
                Your logged-in user account is not currently linked to an Employee record in the HR module. As an Admin/HR manager, you can link your account to an existing profile or create a new one.
              </p>
              <div className="pt-2">
                <Link
                  to="/hr"
                  className="btn btn-primary text-xs inline-flex items-center gap-2"
                >
                  <UserCheck size={16} />
                  Go to Employee Directory to Link Profile
                </Link>
              </div>
            </>
          ) : (
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Your employee profile hasn't been set up or linked to your user account yet. Please contact your HR administrator to link your profile so you can apply for leaves and view attendance.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <div>
        <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-text-primary">Employee Self-Service Portal</h2>
        <p className="text-text-muted text-xs mt-0.5">Apply for leaves, view holiday quotas, and check monthly attendance logs.</p>
      </div>

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      {/* Leave Quota Cards */}
      <div>
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">My Leave Quotas</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {balances.map(b => (
            <div key={b.id} className="sheet p-4 space-y-2">
              <p className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider">{b.leave_type_name}</p>
              <p className="text-2xl font-mono font-black text-text-primary">
                {b.remaining_days} <span className="text-xs font-normal text-text-muted">/ {b.total_days} left</span>
              </p>
              <div className="w-full bg-bg-surface h-1.5 rounded-xs overflow-hidden border border-border-color">
                <div 
                  className="bg-accent-primary h-full transition-all duration-300" 
                  style={{ width: `${Math.min((b.remaining_days / (b.total_days || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {balances.length === 0 && (
            <p className="text-text-muted text-xs font-mono italic col-span-4">No leave balances found for current year.</p>
          )}
        </div>
      </div>

      {/* Form and Applications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apply Form */}
        <div className="sheet p-5 space-y-4 h-fit">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-color pb-2">
            <Calendar size={16} className="text-accent-primary" />
            Apply for Leave
          </h3>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Leave Type *</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="field w-full text-xs"
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
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">From Date *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="field w-full text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">To Date *</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="field w-full text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Reason / Remarks *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field w-full text-xs h-20"
                placeholder="Provide details about leave application"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-xs"
            >
              Submit Leave Request
            </button>
          </form>
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2 sheet p-5 space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-color pb-2">
            <Clock size={16} className="text-accent-primary" />
            My Leave Application History
          </h3>
          <div className="overflow-y-auto max-h-[350px] space-y-2.5">
            {applications.length === 0 ? (
              <p className="text-text-muted text-xs font-mono italic text-center py-8">No previous leave applications submitted.</p>
            ) : (
              applications.map(app => (
                <div key={app.id} className="p-3 bg-bg-surface border border-border-color rounded-xs flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-text-primary">{app.leave_type_name}</p>
                    <p className="text-text-secondary mt-0.5 font-mono text-[11px]">
                      {new Date(app.from_date).toLocaleDateString()} to {new Date(app.to_date).toLocaleDateString()}
                    </p>
                    <p className="text-text-muted text-[11px] italic mt-1">{app.reason}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={app.status} />
                    {app.approver_name && (
                      <p className="text-[10px] text-text-muted mt-1 font-mono">Reviewer: {app.approver_name}</p>
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
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary border-b border-border-color pb-2">Clock Logs (Current Month)</h3>
        {attendance.length === 0 ? (
          <p className="text-text-muted text-xs font-mono italic text-center py-6">No attendance logs found for this month.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 font-mono">
            {attendance.map(att => (
              <div key={att.id} className="p-2.5 bg-bg-surface border border-border-color rounded-xs text-center space-y-1">
                <p className="text-[10px] text-text-muted">{new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                <div>
                  <StatusBadge status={att.status} />
                </div>
                {(att.check_in || att.check_out) && (
                  <p className="text-[10px] text-text-muted mt-1">
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
