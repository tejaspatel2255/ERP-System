import React, { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { getDesignTasks, createDesignTask, updateDesignTaskStatus, getDesignFiles } from '../../api/designApi';
import { getUsers } from '../../api/userApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

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

  const priorityColors = {
    'High': 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30',
    'Medium': 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30',
    'Low': 'bg-accent-info/15 text-accent-info border border-accent-info/30'
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Design Tasks Kanban"
        description="Organize CAD drawings creation workflows, track task states, and coordinate assignments."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            + Create Task
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      {loading ? (
        <div className="p-12 text-center text-text-muted bg-bg-card border border-border-color rounded-2xl">Loading task board...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);

            return (
              <div key={col.key} className="min-w-0 bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col min-h-[480px] shadow-brand">
                <div className={`border-t-4 ${col.borderClass} pt-2 pb-4 flex justify-between items-center`}>
                  <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">{col.label}</h3>
                  <span className="bg-bg-secondary text-text-secondary font-mono text-xs px-2.5 py-0.5 rounded-full border border-border-color font-semibold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-bg-secondary border border-border-color rounded-xl p-4 space-y-3 shadow-sm hover:border-text-muted transition-colors">
                      <div>
                        <h4 className="font-bold text-text-primary text-sm">{task.title}</h4>
                        <p className="text-text-muted text-xs mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      {task.design_file_title && (
                        <div className="bg-bg-card border border-border-color rounded-lg p-2 text-[11px] text-accent-primary font-mono flex items-center gap-1.5 min-w-0">
                          <span>📎</span> <span className="truncate">{task.design_file_title}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${priorityColors[task.priority] || priorityColors['Medium']}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-text-muted font-mono">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border-color flex justify-between items-center">
                        <span className="text-[11px] text-text-secondary font-medium truncate max-w-[100px]">
                          {task.assigned_to_name ? `👤 ${task.assigned_to_name}` : 'Unassigned'}
                        </span>

                        <div className="flex gap-1 shrink-0">
                          {col.key !== 'Pending' && (
                            <button
                              onClick={() => {
                                const prev = columns[columns.findIndex(c => c.key === col.key) - 1].key;
                                handleMoveTask(task.id, prev);
                              }}
                              className="w-6 h-6 bg-bg-card hover:bg-bg-hover text-text-secondary border border-border-color rounded-lg flex items-center justify-center text-[10px] transition-all"
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
                              className="w-6 h-6 bg-bg-card hover:bg-bg-hover text-text-secondary border border-border-color rounded-lg flex items-center justify-center text-[10px] transition-all"
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
            <label className="block text-xs font-semibold text-text-secondary mb-1">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              placeholder="E.g., Draw electrical wiring layout"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm h-20 focus:outline-none focus:border-accent-primary"
              placeholder="Task instructions..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Assign To (User)</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              >
                <option value="">-- Select Designer --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Link Design File</label>
              <select
                value={designFileId}
                onChange={(e) => setDesignFileId(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              >
                <option value="">-- Choose File (Optional) --</option>
                {designFiles.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
