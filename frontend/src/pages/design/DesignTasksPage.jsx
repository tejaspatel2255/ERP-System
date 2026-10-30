import React, { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
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
    { key: 'Pending', label: 'To Do', borderClass: 'border-t-text-muted' },
    { key: 'In Progress', label: 'In Progress', borderClass: 'border-t-accent-primary' },
    { key: 'In Review', label: 'In Review', borderClass: 'border-t-accent-warning' },
    { key: 'Completed', label: 'Done', borderClass: 'border-t-accent-success' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Design Tasks Kanban"
        description="Organize CAD drawings creation workflows, track task states, and coordinate assignments."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary text-xs uppercase tracking-wider font-mono"
          >
            + Create Task
          </button>
        }
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      {loading ? (
        <div className="p-12 text-center text-text-muted sheet text-xs font-mono">Loading task board...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);

            return (
              <div key={col.key} className="min-w-0 sheet p-3.5 flex flex-col min-h-[480px]">
                <div className={`border-t-2 ${col.borderClass} pt-2 pb-3 flex justify-between items-center`}>
                  <h3 className="font-mono font-bold text-text-primary text-xs uppercase tracking-wider">{col.label}</h3>
                  <span className="bg-bg-surface text-text-secondary font-mono text-[10px] px-2 py-0.5 rounded-xs border border-border-color font-bold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-bg-surface border border-border-color rounded-xs p-3 space-y-2.5 shadow-2xs hover:border-text-muted transition-colors">
                      <div>
                        <h4 className="font-semibold text-text-primary text-xs">{task.title}</h4>
                        <p className="text-text-muted text-[11px] mt-0.5 line-clamp-2">{task.description}</p>
                      </div>

                      {task.design_file_title && (
                        <div className="bg-bg-card border border-border-color rounded-xs p-1.5 text-[10px] text-accent-primary font-mono flex items-center gap-1.5 min-w-0">
                          <span>📎</span> <span className="truncate">{task.design_file_title}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px]">
                        <StatusBadge status={task.priority} />
                        {task.due_date && (
                          <span className="text-text-muted font-mono">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border-color flex justify-between items-center text-xs">
                        <span className="text-[10px] font-mono text-text-secondary font-medium truncate max-w-[100px]">
                          {task.assigned_to_name ? `👤 ${task.assigned_to_name}` : 'Unassigned'}
                        </span>

                        <div className="flex gap-1 shrink-0">
                          {col.key !== 'Pending' && (
                            <button
                              onClick={() => {
                                const prev = columns[columns.findIndex(c => c.key === col.key) - 1].key;
                                handleMoveTask(task.id, prev);
                              }}
                              className="btn btn-secondary text-[10px] py-0.5 px-1.5"
                              title="Move back"
                            >
                              ◀
                            </button>
                          )}
                          {col.key !== 'Completed' && (
                            <button
                              onClick={() => {
                                const next = columns[columns.findIndex(c => c.key === col.key) + 1].key;
                                handleMoveTask(task.id, next);
                              }}
                              className="btn btn-secondary text-[10px] py-0.5 px-1.5"
                              title="Move forward"
                            >
                              ▶
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
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field w-full"
              placeholder="E.g., Draw electrical wiring layout"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field w-full h-20"
              placeholder="Task instructions..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Assign To (User)</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="field w-full text-xs"
              >
                <option value="">-- Select Designer --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="field w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="field w-full text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Attach Design File</label>
              <select
                value={designFileId}
                onChange={(e) => setDesignFileId(e.target.value)}
                className="field w-full text-xs"
              >
                <option value="">-- Optional File Attachment --</option>
                {designFiles.map(df => (
                  <option key={df.id} value={df.id}>{df.title} (v{df.latest_version})</option>
                ))}
              </select>
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
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
