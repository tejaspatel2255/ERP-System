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
import StatusBadge from '../../components/StatusBadge';

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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Training & Upskilling"
        description="Organize professional workshops, assign attendees, and track course completion."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary text-xs uppercase tracking-wider font-mono"
          >
            + Schedule Session
          </button>
        }
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Sessions Table Left Panel */}
        <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-text-muted text-xs font-mono">Loading training sessions...</div>
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
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className="border-b border-border-color bg-bg-surface text-text-muted font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">Session Details</th>
                    <th className="p-3">Trainer</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Completion Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {sessions.map((sess) => (
                    <tr
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={`hover:bg-bg-hover cursor-pointer transition-colors ${
                        selectedSession?.id === sess.id ? 'bg-bg-surface font-semibold' : ''
                      }`}
                    >
                      <td className="p-3">
                        <p className="font-bold text-text-primary">{sess.title}</p>
                        <p className="text-[11px] text-text-muted max-w-[12rem] truncate">{sess.description || 'No description'}</p>
                      </td>
                      <td className="p-3 font-medium text-text-primary">{sess.trainer}</td>
                      <td className="p-3 font-mono text-[11px] text-text-secondary">{new Date(sess.scheduled_date).toLocaleString()}</td>
                      <td className="p-3">
                        <StatusBadge status={sess.status} />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-text-primary">
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
        <div className="min-w-0 sheet p-5 space-y-5">
          {selectedSession ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">{selectedSession.title}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{selectedSession.description}</p>
                <div className="mt-3 text-xs space-y-1 font-mono text-text-secondary border-t border-border-color pt-3">
                  <p><span className="text-text-muted uppercase font-bold text-[10px]">Instructor:</span> {selectedSession.trainer}</p>
                  <p><span className="text-text-muted uppercase font-bold text-[10px]">Time:</span> {new Date(selectedSession.scheduled_date).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2 border-b border-border-color pb-1">Assigned Employees</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {attendees.map(att => (
                    <div key={att.employee_id} className="bg-bg-surface border border-border-color rounded-xs p-2.5 flex justify-between items-center text-xs">
                      <div className="truncate pr-2">
                        <p className="font-semibold text-text-primary truncate">{att.employee_name}</p>
                        <p className="text-text-muted text-[10px] truncate">{att.designation}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={att.status} />
                        {att.status === 'Assigned' && (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Completed')}
                              className="btn btn-success text-[10px] py-0.5 px-2"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(att.employee_id, 'Absent')}
                              className="btn btn-danger text-[10px] py-0.5 px-2"
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
            <div className="text-center py-10 text-text-muted text-xs font-mono italic">
              Select a training session on the left to inspect its details and attendee checklist.
            </div>
          )}
        </div>
      </div>

      {/* CREATE SESSION MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Training Session"
        size="lg"
      >
        <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Session Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field w-full"
              placeholder="E.g., CNC Machine Operation & Safety Procedures"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field w-full h-20"
              placeholder="Curriculum overview and objectives..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Trainer / Instructor *</label>
              <input
                type="text"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="field w-full"
                placeholder="Name or agency"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="field w-full font-mono text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1.5">Assign Employees</label>
            <div className="border border-border-color rounded-xs bg-bg-surface p-3 max-h-48 overflow-y-auto space-y-1.5">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-bg-hover p-1 rounded-xs">
                  <input
                    type="checkbox"
                    checked={selectedEmpIds.includes(emp.id)}
                    onChange={() => handleEmpCheckboxChange(emp.id)}
                    className="rounded-xs border-border-color text-accent-primary"
                  />
                  <span>{emp.name} <span className="text-text-muted font-mono">({emp.emp_code} - {emp.designation})</span></span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs"
            >
              Create Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
