import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import {
  getTrainingSessions,
  createTrainingSession,
  getTrainingSessionById,
  markTrainingAttendance,
  getEmployees
} from '../../api/hrApi';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

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
    <div className="p-6 animate-in fade-in duration-300">
      <PageHeader
        title="Training & Upskilling"
        description="Organize professional workshops, assign attendees, and mark course completion logs."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Schedule Session
          </button>
        }
      />

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading training sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={BookOpen}
                title="No training sessions scheduled"
                description="There are no upcoming or past training sessions. Start by scheduling a new session."
                actionLabel="Schedule Session"
                onAction={() => setShowCreateModal(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Session Details</th>
                    <th className="p-4">Trainer</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Completion Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {sessions.map((sess) => (
                    <tr
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        selectedSession?.id === sess.id ? 'bg-blue-50/50 dark:bg-slate-800/75' : ''
                      }`}
                    >
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-white">{sess.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[12rem] truncate">{sess.description || 'No description'}</p>
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-slate-300">{sess.trainer}</td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{new Date(sess.scheduled_date).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sess.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30' :
                          sess.status === 'Ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        }`}>
                          {sess.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-semibold text-slate-900 dark:text-slate-300">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit">
          {selectedSession ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedSession.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedSession.description}</p>
                <div className="mt-4 text-sm space-y-2 text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <p><span className="text-slate-500 dark:text-slate-400 font-medium">Instructor:</span> {selectedSession.trainer}</p>
                  <p><span className="text-slate-500 dark:text-slate-400 font-medium">Time:</span> {new Date(selectedSession.scheduled_date).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Assigned Employees</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {attendees.map(att => (
                    <div key={att.employee_id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex justify-between items-center text-sm">
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{att.employee_name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{att.designation}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-400' :
                          att.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-400' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-400'
                        }`}>
                          {att.status}
                        </span>
                        {att.status === 'Assigned' && (
                          <div className="flex gap-1.5 mt-1">
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Completed')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white shadow-sm transition-colors"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Absent')}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white shadow-sm transition-colors"
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
            <div className="text-center py-12">
              <EmptyState
                icon={BookOpen}
                title="No session selected"
                description="Select a training session to view the roster and mark completion records."
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Training Session"
        size="md"
      >
        <form onSubmit={handleCreateSessionSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Course Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Safety induction"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Trainer Name</label>
              <input
                type="text"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Session Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Roster (Select Employees)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 max-h-[160px] overflow-y-auto">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`emp-${emp.id}`}
                    checked={selectedEmpIds.includes(emp.id)}
                    onChange={() => handleEmpCheckboxChange(emp.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`emp-${emp.id}`} className="text-slate-700 dark:text-slate-300 truncate cursor-pointer" title={emp.name}>{emp.name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              Schedule Course
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
