import React, { useState, useEffect } from 'react';
import {
  getLeaveApplications,
  getLeaveTypes,
  createLeaveType,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  getEmployees
} from '../../api/hrApi';

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

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">Leave Management</h1>
          <p className="text-slate-400 text-sm mt-1">Review leave applications, manage leave allocation rules, and check remaining balances.</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm">{success}</div>}

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-6 gap-2">
        {['applications', 'types', 'balances'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-bold border-b-2 capitalize transition-all ${
              activeTab === tab 
                ? 'border-rose-500 text-rose-400 bg-rose-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pending-only"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="w-4 h-4 bg-slate-900 border-slate-700 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="pending-only" className="text-slate-300 font-semibold text-sm">Show Pending Only</label>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No leave applications found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-sm">
                      <th className="p-4">Employee</th>
                      <th className="p-4">Leave Type</th>
                      <th className="p-4">From</th>
                      <th className="p-4">To</th>
                      <th className="p-4 text-center">Days</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                        <td className="p-4 font-semibold text-white">{app.employee_name}</td>
                        <td className="p-4 text-rose-400 font-medium">{app.leave_type_name}</td>
                        <td className="p-4">{new Date(app.from_date).toLocaleDateString()}</td>
                        <td className="p-4">{new Date(app.to_date).toLocaleDateString()}</td>
                        <td className="p-4 text-center font-mono font-semibold">{calculateDays(app.from_date, app.to_date)}</td>
                        <td className="p-4 text-slate-400 italic max-w-xs truncate" title={app.reason}>{app.reason}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            app.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' :
                            app.status === 'Rejected' ? 'bg-red-500/20 text-red-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {app.status === 'Pending' ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleApprove(app.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReject(app.id)}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading leave types...</div>
            ) : leaveTypes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No leave types defined.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-sm">
                      <th className="p-4">Leave Type Name</th>
                      <th className="p-4 text-right">Days Allowed Per Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {leaveTypes.map((lt) => (
                      <tr key={lt.id} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="p-4 font-semibold text-white">{lt.name}</td>
                        <td className="p-4 text-right font-mono font-semibold text-slate-300">{lt.days_allowed_per_year} Days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Create Leave Type</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Type Name</label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                  placeholder="E.g., Sick Leave, Casual Leave"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Days Allowed Per Year</label>
                <input
                  type="number"
                  value={daysAllowed}
                  onChange={(e) => setDaysAllowed(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-sm"
                  placeholder="E.g., 12"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-rose-500/20"
              >
                Create Type
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-slate-300">Select Employee:</label>
            <select
              value={selectedEmpForBalance}
              onChange={(e) => handleEmpBalanceChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-white focus:outline-none text-sm"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.emp_code})</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
            {!selectedEmpForBalance ? (
              <div className="p-8 text-center text-slate-500 italic text-sm">Select an employee to view leave balances.</div>
            ) : loading ? (
              <div className="p-8 text-center text-slate-400">Loading balances...</div>
            ) : balances.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No leave balances found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-sm">
                      <th className="p-4">Leave Type</th>
                      <th className="p-4 text-center">Year</th>
                      <th className="p-4 text-center">Allocated Days</th>
                      <th className="p-4 text-center">Used Days</th>
                      <th className="p-4 text-center">Remaining Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {balances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="p-4 font-semibold text-white">{b.leave_type_name}</td>
                        <td className="p-4 text-center font-mono">{b.year}</td>
                        <td className="p-4 text-center font-mono">{b.total_days}</td>
                        <td className="p-4 text-center font-mono text-amber-400">{b.used_days}</td>
                        <td className="p-4 text-center font-mono text-emerald-400 font-bold">{b.remaining_days}</td>
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
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-md font-bold text-white font-sans">Reject Leave Application</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleReject} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-sm">Provide Reason/Remark for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 transition-all h-24 text-sm"
                  placeholder="E.g., Operational requirements or insufficient staff coverage"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium text-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
