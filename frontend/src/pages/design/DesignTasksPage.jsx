import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, ArrowLeft, ArrowRight, Paperclip, User } from 'lucide-react';
import { getDesignTasks, createDesignTask, updateDesignTaskStatus, getDesignFiles } from '../../api/designApi';
import { getUsers } from '../../api/userApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function DesignTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [designFiles, setDesignFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [designFileId, setDesignFileId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes, filesRes] = await Promise.all([
        getDesignTasks(),
        getUsers({ limit: 100 }),
        getDesignFiles()
      ]);
      setTasks(tasksRes.tasks || []);
      setUsers(usersRes.users || []);
      setDesignFiles(filesRes.designFiles || []);
    } catch (err) {
      setError('Failed to fetch design task board.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createDesignTask({
        title,
        description,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        priority,
        design_file_id: designFileId || null
      });
      setSuccess('Design task created successfully.');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDueDate('');
      setPriority('Medium');
      setDesignFileId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleMoveTask = async (taskId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      await updateDesignTaskStatus(taskId, newStatus);
      fetchData();
    } catch (err) {
      setError('Failed to transition task status.');
    }
  };

  const columns = [
    { key: 'Pending', label: 'To Do', borderClass: 'border-t-[var(--text-muted)]' },
    { key: 'In Progress', label: 'In Progress', borderClass: 'border-t-[var(--accent-primary)]' },
    { key: 'In Review', label: 'In Review', borderClass: 'border-t-[var(--warning-rail)]' },
    { key: 'Completed', label: 'Done', borderClass: 'border-t-[var(--success-rail)]' }
  ];

  const priorityRailColor = (p) => {
    const val = (p || '').toLowerCase();
    if (val === 'high' || val === 'critical') return 'border-l-[var(--danger-rail)]';
    if (val === 'medium') return 'border-l-[var(--warning-rail)]';
    return 'border-l-[var(--info-rail)]';
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Design Tasks Kanban"
        description="Organize CAD drawings creation workflows, track task states, and coordinate assignments."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Task
          </button>
        }
      />

      {error && (
        <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-rail)] rounded text-[var(--danger-rail)] text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-[var(--success-soft)] border border-[var(--success-rail)] rounded text-[var(--success-rail)] text-xs">
          {success}
        </div>
      )}

      {loading ? (
        <div className="sheet p-12 text-center text-text-muted text-sm">
          Loading task board...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);

            return (
              <div
                key={col.key}
                className="rounded-lg bg-bg-secondary border border-border-color p-3 flex flex-col min-h-[480px]"
              >
                <div className={`border-t-2 ${col.borderClass} pt-2 pb-3 flex justify-between items-center`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    {col.label}
                  </h3>
                  <span className="tb-cell text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      className={`sheet p-3 space-y-2.5 border-l-[3px] ${priorityRailColor(task.priority)} hover:border-border-color transition-colors`}
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary leading-snug">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {task.design_file_title && (
                        <div className="bg-bg-secondary border border-border-color rounded px-2 py-1 text-xs text-accent-primary font-mono flex items-center gap-1.5 min-w-0">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.design_file_title}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs pt-1">
                        <StatusBadge status={task.priority} />
                        {task.due_date && (
                          <span className="text-[11px] font-mono text-text-muted">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border-color flex justify-between items-center">
                        <span className="text-xs text-text-secondary font-medium truncate max-w-[110px] inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-text-muted shrink-0" />
                          <span className="truncate">{task.assigned_to_name || 'Unassigned'}</span>
                        </span>

                        <div className="flex gap-1 shrink-0">
                          {col.key !== 'Pending' && (
                            <button
                              onClick={() => {
                                const prev = columns[columns.findIndex(c => c.key === col.key) - 1].key;
                                handleMoveTask(task.id, prev);
                              }}
                              className="btn-ghost btn-xs p-1"
                              title="Move back"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {col.key !== 'Completed' && (
                            <button
                              onClick={() => {
                                const next = columns[columns.findIndex(c => c.key === col.key) + 1].key;
                                handleMoveTask(task.id, next);
                              }}
                              className="btn-ghost btn-xs p-1"
                              title="Move forward"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-8">
                      <EmptyState
                        icon={CheckSquare}
                        title="No Tasks"
                        description={`No items in ${col.label}.`}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Design Task"
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="E.g., Draw electrical wiring layout"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field h-20"
              placeholder="Task instructions..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Assign To (User)
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="field"
              >
                <option value="">-- Select Designer --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="field"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Link Design File
              </label>
              <select
                value={designFileId}
                onChange={(e) => setDesignFileId(e.target.value)}
                className="field"
              >
                <option value="">-- Choose File (Optional) --</option>
                {designFiles.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
