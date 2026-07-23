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
      handleSelectSession(selectedSession);
      fetchData();
    } catch (err) {
      setError('Failed to mark attendee attendance.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Training & Upskilling"
        description="Organize professional workshops, assign attendees, and mark course completion logs."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            Schedule Session
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Sessions Table Left Panel */}
        <div className="lg:col-span-2 min-w-0 bg-bg-card border border-border-color rounded-2xl shadow-brand overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-text-muted text-sm">Loading training sessions...</div>
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
                  <tr className="border-b border-border-color bg-bg-secondary text-text-muted font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Session Details</th>
                    <th className="p-4">Trainer</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Completion Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color text-sm">
                  {sessions.map((sess) => (
                    <tr
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={`hover:bg-bg-hover cursor-pointer transition-colors ${
                        selectedSession?.id === sess.id ? 'bg-bg-secondary font-semibold' : ''
                      }`}
                    >
                      <td className="p-4">
                        <p className="font-bold text-text-primary">{sess.title}</p>
                        <p className="text-xs text-text-muted max-w-[12rem] truncate">{sess.description || 'No description'}</p>
                      </td>
                      <td className="p-4 font-medium text-text-primary">{sess.trainer}</td>
                      <td className="p-4 text-xs text-text-secondary">{new Date(sess.scheduled_date).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sess.status === 'Completed' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' :
                          sess.status === 'Ongoing' ? 'bg-accent-info/15 text-accent-info border border-accent-info/30' :
                          'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
                        }`}>
                          {sess.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-semibold text-text-primary">
                        {sess.completed_count} / {sess.assigned_count} Completed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Session Info Right Panel */}
        <div className="min-w-0 bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand h-fit space-y-6">
          {selectedSession ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{selectedSession.title}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{selectedSession.description}</p>
                <div className="mt-4 text-xs space-y-2 text-text-secondary border-t border-border-color pt-4">
                  <p><span className="text-text-muted font-medium">Instructor:</span> {selectedSession.trainer}</p>
                  <p><span className="text-text-muted font-medium">Time:</span> {new Date(selectedSession.scheduled_date).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Assigned Employees</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {attendees.map(att => (
                    <div key={att.employee_id} className="bg-bg-secondary border border-border-color rounded-xl p-3 flex justify-between items-center text-xs">
                      <div className="truncate pr-2">
                        <p className="font-bold text-text-primary truncate">{att.employee_name}</p>
                        <p className="text-text-muted text-[11px] truncate">{att.designation}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'Completed' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' :
                          att.status === 'Absent' ? 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30' :
                          'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
                        }`}>
                          {att.status}
                        </span>
                        {att.status === 'Assigned' && (
                          <div className="flex gap-1.5 mt-1">
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Completed')}
                              className="px-2 py-1 bg-accent-success hover:opacity-90 rounded-lg text-xs text-white shadow-sm transition-colors"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Absent')}
                              className="px-2 py-1 bg-accent-danger hover:opacity-90 rounded-lg text-xs text-white shadow-sm transition-colors"
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
            <div className="text-center py-8">
              <EmptyState
                icon={BookOpen}
                title="No session selected"
                description="Select a training session from the table on the left to view the roster and mark completion records."
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
        <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Course Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                placeholder="E.g., Safety induction"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Trainer Name *</label>
              <input
                type="text"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Session Date & Time *</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2 px-3 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">Assign Roster (Select Employees)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-bg-secondary/60 p-3 rounded-2xl border border-border-color max-h-[160px] overflow-y-auto">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    id={`emp-${emp.id}`}
                    checked={selectedEmpIds.includes(emp.id)}
                    onChange={() => handleEmpCheckboxChange(emp.id)}
                    className="w-4 h-4 rounded border-border-color text-accent-primary focus:ring-accent-primary"
                  />
                  <label htmlFor={`emp-${emp.id}`} className="text-text-primary truncate cursor-pointer" title={emp.name}>{emp.name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl border border-border-color bg-bg-secondary py-2 px-4 text-sm font-semibold text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors shadow-sm"
            >
              Schedule Course
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
