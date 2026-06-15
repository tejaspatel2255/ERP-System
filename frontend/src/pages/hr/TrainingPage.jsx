import React, { useState, useEffect } from 'react';
import {
  getTrainingSessions,
  createTrainingSession,
  getTrainingSessionById,
  markTrainingAttendance,
  getEmployees
} from '../../api/hrApi';

export default function TrainingPage() {
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Session Details
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendees, setAttendees] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trainer, setTrainer] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessRes, empRes] = await Promise.all([
        getTrainingSessions(),
        getEmployees()
      ]);
      setSessions(sessRes.sessions || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      setError('Failed to fetch training sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (session) => {
    try {
      const res = await getTrainingSessionById(session.id);
      setSelectedSession(res.session);
      setAttendees(res.attendees || []);
    } catch (err) {
      setError('Failed to load session details.');
    }
  };

  const handleEmpCheckboxChange = (empId) => {
    if (selectedEmpIds.includes(empId)) {
      setSelectedEmpIds(selectedEmpIds.filter(id => id !== empId));
    } else {
      setSelectedEmpIds([...selectedEmpIds, empId]);
    }
  };

  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check date: cannot be in past
    if (new Date(scheduledDate) < new Date()) {
      setError('Training session date cannot be in the past.');
      return;
    }

    try {
      await createTrainingSession({
        title,
        description,
        trainer,
        scheduled_date: scheduledDate,
        employee_ids: selectedEmpIds
      });
      setSuccess('Training session scheduled successfully.');
      setShowCreateModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      setTrainer('');
      setScheduledDate('');
      setSelectedEmpIds([]);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create training session.');
    }
  };

  const handleMarkAttendance = async (empId, status) => {
    if (!selectedSession) return;
    setError('');
    setSuccess('');
    try {
      await markTrainingAttendance(selectedSession.id, {
        employee_id: empId,
        status
      });
      setSuccess('Attendee attendance updated.');
      // Refresh attendees and sessions list
      handleSelectSession(selectedSession);
      fetchData();
    } catch (err) {
      setError('Failed to mark attendee attendance.');
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent font-sans">Training & Upskilling</h1>
          <p className="text-slate-400 text-sm mt-1">Organize professional workshops, assign attendees, and mark course completion logs.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
        >
          <span>+</span> Schedule Session
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Table */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading training sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No training sessions scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Session Details</th>
                    <th className="p-4">Trainer</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Completion Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {sessions.map((sess) => (
                    <tr
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={`hover:bg-slate-850 cursor-pointer transition-colors ${
                        selectedSession?.id === sess.id ? 'bg-slate-800/75' : ''
                      }`}
                    >
                      <td className="p-4">
                        <p className="font-bold text-white">{sess.title}</p>
                        <p className="text-xs text-slate-400 max-w-xs truncate">{sess.description || 'No description'}</p>
                      </td>
                      <td className="p-4 font-medium">{sess.trainer}</td>
                      <td className="p-4 text-xs text-slate-300">{new Date(sess.scheduled_date).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sess.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          sess.status === 'Ongoing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {sess.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {sess.completed_count} / {sess.assigned_count} Completed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Session Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl h-fit">
          {selectedSession ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedSession.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedSession.description}</p>
                <div className="mt-3 text-xs space-y-1 text-slate-300 border-t border-slate-700/50 pt-2">
                  <p><span className="text-slate-500">Instructor:</span> {selectedSession.trainer}</p>
                  <p><span className="text-slate-500">Time:</span> {new Date(selectedSession.scheduled_date).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned Employees</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {attendees.map(att => (
                    <div key={att.employee_id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{att.employee_name}</p>
                        <p className="text-slate-400 text-[10px]">{att.designation}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          att.status === 'Completed' ? 'bg-emerald-500/25 text-emerald-400' :
                          att.status === 'Absent' ? 'bg-red-500/25 text-red-400' :
                          'bg-amber-500/25 text-amber-400'
                        }`}>
                          {att.status}
                        </span>
                        {att.status === 'Assigned' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Completed')}
                              className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-[9px] text-white"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Absent')}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 rounded text-[9px] text-white"
                            >
                              Abs
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              Select a training session to view roster and mark completion records.
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white font-sans">Schedule Training Session</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateSessionSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Course Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                    placeholder="E.g., Safety induction, ISO audits"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Trainer Name</label>
                  <input
                    type="text"
                    value={trainer}
                    onChange={(e) => setTrainer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Session Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm font-sans">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Roster Assignment */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-sm">Assign Roster (Select Employees)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 max-h-[160px] overflow-y-auto">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        id={`emp-${emp.id}`}
                        checked={selectedEmpIds.includes(emp.id)}
                        onChange={() => handleEmpCheckboxChange(emp.id)}
                        className="w-4 h-4 bg-slate-900 border-slate-700 rounded text-indigo-600"
                      />
                      <label htmlFor={`emp-${emp.id}`} className="text-slate-300 truncate" title={emp.name}>{emp.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium text-sm"
                >
                  Schedule Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
