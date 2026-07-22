import React, { useState, useEffect } from 'react';
import { getDesignTasks, createDesignTask, updateDesignTaskStatus, getDesignFiles } from '../../api/designApi';
import { getUsers } from '../../api/userApi';

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
        getUsers({ limit: 100 }), // load users for assignment
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
      // Reset form
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
    { key: 'Pending', label: 'To Do', borderClass: 'border-t-slate-500' },
    { key: 'In Progress', label: 'In Progress', borderClass: 'border-t-blue-500' },
    { key: 'In Review', label: 'In Review', borderClass: 'border-t-amber-500' },
    { key: 'Completed', label: 'Done', borderClass: 'border-t-emerald-500' }
  ];

  const priorityColors = {
    'High': 'bg-red-500/20 text-red-400',
    'Medium': 'bg-amber-500/20 text-amber-400',
    'Low': 'bg-blue-500/20 text-blue-400'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Design Tasks Kanban</h2>
          <p className="text-text-secondary text-sm mt-1">Organize CAD drawings creation workflows, track task states, and coordinate assignments.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent-primary hover:opacity-90 text-white font-medium py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <span>+</span> Create Task
        </button>
      </div>

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 rounded-xl text-accent-success text-sm">{success}</div>}

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading task board...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);

            return (
              <div key={col.key} className="bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col min-h-[500px] shadow-brand">
                <div className={`border-t-4 ${col.borderClass} pt-2 pb-4 flex justify-between items-center`}>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">{col.label}</h3>
                  <span className="bg-slate-700/50 text-slate-300 font-mono text-xs px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg hover:border-slate-700 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{task.title}</h4>
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      {task.design_file_title && (
                        <div className="bg-slate-950/50 border border-slate-800 rounded p-1.5 text-[10px] text-teal-400 font-mono flex items-center gap-1">
                          <span>📎</span> <span className="truncate">{task.design_file_title}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-slate-500 font-mono">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">
                          {task.assigned_to_name ? `👤 ${task.assigned_to_name}` : 'Unassigned'}
                        </span>

                        {/* Transition Buttons */}
                        <div className="flex gap-1">
                          {col.key !== 'Pending' && (
                            <button
                              onClick={() => {
                                const prev = columns[columns.findIndex(c => c.key === col.key) - 1].key;
                                handleMoveTask(task.id, prev);
                              }}
                              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded flex items-center justify-center text-[10px]"
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
                              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded flex items-center justify-center text-[10px]"
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
                    <div className="text-center text-slate-500 text-xs italic py-12 border border-dashed border-slate-800 rounded-lg">
                      No tasks in column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white font-sans">Create Design Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                  placeholder="E.g., Draw electrical wiring layout"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Assign To (User)</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none"
                  >
                    <option value="">-- Select Designer --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-sm">Link Design File</label>
                  <select
                    value={designFileId}
                    onChange={(e) => setDesignFileId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none"
                  >
                    <option value="">-- Choose File (Optional) --</option>
                    {designFiles.map(f => (
                      <option key={f.id} value={f.id}>{f.title}</option>
                    ))}
                  </select>
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium text-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
