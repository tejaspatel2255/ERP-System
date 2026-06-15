import React, { useState, useEffect } from 'react';
import {
  getSelfAttendance,
  getSelfLeaveBalance,
  selfApplyLeave,
  getSelfLeaveApplications,
  getLeaveTypes
} from '../../api/hrApi';

export default function SelfServicePage() {
  const [attendance, setAttendance] = useState([]);
  const [balances, setBalances] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setError(err.response?.data?.message || 'Failed to load self-service profile. Ensure your user account is linked to an employee profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check date: cannot be in the past
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
      setSuccess('Leave applied successfully and pending review.');
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
    'Present': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    'Absent': 'bg-red-500/20 text-red-300 border border-red-500/30',
    'Half Day': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    'Leave': 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Employee Self-Service</h1>
        <p className="text-slate-400 text-sm mt-1 font-sans">Apply for leaves, check your remaining holiday quotas, and view monthly attendance logs.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm">{success}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading profile data...</div>
      ) : (
        <div className="space-y-8">
          {/* Leave Quota Cards */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">My Leave Balance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {balances.map(b => (
                <div key={b.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 shadow-md backdrop-blur-md">
                  <p className="text-xs text-slate-400 font-semibold">{b.leave_type_name}</p>
                  <p className="text-3xl font-black text-slate-100 mt-2">{b.remaining_days} <span className="text-xs font-normal text-slate-400">/ {b.total_days} left</span></p>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full rounded-full" 
                      style={{ width: `${(b.remaining_days / b.total_days) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {balances.length === 0 && (
                <p className="text-slate-500 text-sm italic col-span-4">No leave balances found.</p>
              )}
            </div>
          </div>

          {/* Form and Applications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Apply Form */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl h-fit">
              <h3 className="text-md font-bold text-white mb-4">Apply for Leave</h3>
              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">Leave Type</label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                    required
                  >
                    <option value="">-- Choose Type --</option>
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs h-20"
                    placeholder="Provide details about leave application"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-sky-500/10"
                >
                  Apply Leave
                </button>
              </form>
            </div>

            {/* Applications List */}
            <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-md font-bold text-white mb-4">My Leave History</h3>
              <div className="overflow-y-auto max-h-[350px] space-y-3">
                {applications.length === 0 ? (
                  <p className="text-slate-500 text-xs italic text-center py-8">No previous leave applications.</p>
                ) : (
                  applications.map(app => (
                    <div key={app.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{app.leave_type_name}</p>
                        <p className="text-slate-400 mt-0.5">
                          {new Date(app.from_date).toLocaleDateString()} to {new Date(app.to_date).toLocaleDateString()}
                        </p>
                        <p className="text-slate-500 text-[11px] italic mt-1">{app.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          app.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {app.status}
                        </span>
                        {app.approver_name && (
                          <p className="text-[10px] text-slate-500 mt-1">Reviewer: {app.approver_name}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Attendance logs list */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-md font-bold text-white mb-4">My Clock logs (Current Month)</h3>
            {attendance.length === 0 ? (
              <p className="text-slate-500 text-xs italic text-center py-6">No attendance logs found for this month.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {attendance.map(att => (
                  <div key={att.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-center space-y-1">
                    <p className="text-[10px] text-slate-500">{new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold ${statusColors[att.status]}`}>
                      {att.status}
                    </span>
                    {(att.check_in || att.check_out) && (
                      <p className="text-[9px] font-mono text-slate-400 mt-1">
                        {att.check_in?.slice(0, 5) || '—'} - {att.check_out?.slice(0, 5) || '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
