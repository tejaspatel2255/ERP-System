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

  const statusColors = {
    'Present': 'bg-accent-success/15 text-accent-success border border-accent-success/30',
    'Absent': 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30',
    'Half Day': 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30',
    'Leave': 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading employee profile...</div>;
  }

  if (unlinked) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 py-6">
        <div className="rounded-2xl border border-accent-warning/40 bg-bg-card p-8 shadow-brand text-center space-y-4 max-w-2xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-warning/20 text-accent-warning">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-xl font-bold text-text-primary">Employee Profile Not Linked</h3>
          
          {canManageHR ? (
            <>
              <p className="text-sm text-text-secondary leading-relaxed">
                Your logged-in user account is not currently linked to an Employee record in the HR module. As an Admin/HR manager, you can link your account to an existing profile or create a new one.
              </p>
              <div className="pt-3">
                <Link
                  to="/hr"
                  className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all gap-2"
                >
                  <UserCheck size={18} />
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Employee Self-Service Portal</h2>
        <p className="text-text-secondary text-sm mt-1">Apply for leaves, view holiday quotas, and check monthly attendance logs.</p>
      </div>

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 rounded-xl text-accent-success text-sm">{success}</div>}

      {/* Leave Quota Cards */}
      <div>
        <h3 className="text-md font-bold text-text-primary mb-3">My Leave Quotas</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {balances.map(b => (
            <div key={b.id} className="bg-bg-card border border-border-color rounded-2xl p-5 shadow-brand">
              <p className="text-xs text-text-muted font-bold uppercase tracking-wider">{b.leave_type_name}</p>
              <p className="text-3xl font-black text-text-primary mt-2">
                {b.remaining_days} <span className="text-xs font-normal text-text-muted">/ {b.total_days} days left</span>
              </p>
              <div className="w-full bg-bg-secondary h-2 rounded-full mt-3 overflow-hidden border border-border-color">
                <div 
                  className="bg-accent-primary h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((b.remaining_days / (b.total_days || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {balances.length === 0 && (
            <p className="text-text-muted text-sm italic col-span-4">No leave balances found for current year.</p>
          )}
        </div>
      </div>

      {/* Form and Applications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apply Form */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand h-fit space-y-4">
          <h3 className="text-md font-bold text-text-primary flex items-center gap-2">
            <Calendar size={18} className="text-accent-primary" />
            Apply for Leave
          </h3>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Leave Type *</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-xs focus:outline-none"
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
                <label className="block text-text-secondary font-semibold mb-1 text-xs">From Date *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-text-secondary font-semibold mb-1 text-xs">To Date *</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Reason / Remarks *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs h-20 focus:outline-none"
                placeholder="Provide details about leave application"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-accent-primary hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
            >
              Submit Leave Request
            </button>
          </form>
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2 bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand space-y-4">
          <h3 className="text-md font-bold text-text-primary flex items-center gap-2">
            <Clock size={18} className="text-accent-primary" />
            My Leave Application History
          </h3>
          <div className="overflow-y-auto max-h-[350px] space-y-3">
            {applications.length === 0 ? (
              <p className="text-text-muted text-xs italic text-center py-8">No previous leave applications submitted.</p>
            ) : (
              applications.map(app => (
                <div key={app.id} className="p-3.5 bg-bg-secondary border border-border-color rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-text-primary">{app.leave_type_name}</p>
                    <p className="text-text-secondary mt-0.5 font-mono">
                      {new Date(app.from_date).toLocaleDateString()} to {new Date(app.to_date).toLocaleDateString()}
                    </p>
                    <p className="text-text-muted text-[11px] italic mt-1">{app.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      app.status === 'Approved' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' :
                      app.status === 'Rejected' ? 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30' :
                      'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
                    }`}>
                      {app.status}
                    </span>
                    {app.approver_name && (
                      <p className="text-[10px] text-text-muted mt-1">Reviewer: {app.approver_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Attendance logs list */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand space-y-4">
        <h3 className="text-md font-bold text-text-primary">Clock Logs (Current Month)</h3>
        {attendance.length === 0 ? (
          <p className="text-text-muted text-xs italic text-center py-6">No attendance logs found for this month.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {attendance.map(att => (
              <div key={att.id} className="p-3 bg-bg-secondary border border-border-color rounded-xl text-center space-y-1">
                <p className="text-[10px] text-text-muted">{new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[att.status]}`}>
                  {att.status}
                </span>
                {(att.check_in || att.check_out) && (
                  <p className="text-[9px] font-mono text-text-muted mt-1">
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
