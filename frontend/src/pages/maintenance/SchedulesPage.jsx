import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getSchedules, createSchedule, logScheduleCompletion, getAssets } from '../../api/maintenanceApi';
import { formatDate } from '../../utils/formatDate';
import axiosInstance from '../../api/axiosInstance';

const SchedulesPage = () => {
  const { hasPermission } = useRole();
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [dueFilter, setDueFilter] = useState('');

  const [form, setForm] = useState({ asset_id: '', frequency: 'Monthly', next_due_date: '', assigned_to: '', notes: '' });
  const [logForm, setLogForm] = useState({ notes: '', next_due_date: '' });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getSchedules({ due: dueFilter });
      if (d.success) setSchedules(d.schedules);
    } catch { toast.error('Failed to load schedules.'); }
    finally { setLoading(false); }
  }, [dueFilter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    getAssets().then(d => { if (d.success) setAssets(d.assets); }).catch(() => {});
    axiosInstance.get('/users').then(r => { if (r.data.success) setEmployees(r.data.users); }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ asset_id: assets[0]?.id || '', frequency: 'Monthly', next_due_date: new Date().toISOString().slice(0, 10), assigned_to: '', notes: '' });
    setIsFormOpen(true);
  };

  const openLog = (sched) => {
    setSelectedSchedule(sched);
    setLogForm({ notes: '', next_due_date: '' });
    setIsLogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSchedule(form);
      toast.success('Schedule created.');
      setIsFormOpen(false);
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to create schedule.');
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await logScheduleCompletion(selectedSchedule.id, logForm);
      toast.success('Maintenance logged. Next due date updated.');
      setIsLogOpen(false);
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to log completion.');
    }
  };

  const columns = [
    { key: 'asset_name', label: 'Asset Name', render: i => <div><div className="font-semibold">{i.asset_name}</div><div className="text-[10px] text-slate-400">{i.asset_code}</div></div> },
    { key: 'frequency', label: 'Frequency' },
    { key: 'next_due_date', label: 'Next Due Date', render: i => formatDate(i.next_due_date) },
    { key: 'assigned_to_name', label: 'Assigned To', render: i => i.assigned_to_name || 'Unassigned' },
    { key: 'due_status', label: 'Due Status', render: i => {
      const colors = i.due_status === 'Overdue' ? 'bg-red-100 text-red-800 border-red-200' : i.due_status === 'Due Today' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200';
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${colors}`}>{i.due_status}</span>;
    }},
    { key: 'actions', label: 'Actions', render: i => (
      hasPermission('maintenance', 'edit') && (
        <button onClick={() => openLog(i)} className="text-white text-xs font-semibold bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">Log Completion</button>
      )
    )}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Maintenance Schedules</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Preventative maintenance planning and schedule execution tracking.</p>
        </div>
        {hasPermission('maintenance', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ Add Schedule</button>}
      </div>

      <div className="flex gap-2 mb-6">
        <select value={dueFilter} onChange={e => setDueFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 text-sm text-slate-900 dark:text-white focus:outline-none">
          <option value="">All Schedules</option>
          <option value="week">Due This Week</option>
          <option value="month">Due This Month</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Next Due Date</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {schedules.map(row => {
              const isOverdue = row.due_status === 'Overdue';
              return (
                <tr key={row.id} className={isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50/50'}>
                  <td className="px-4 py-3"><div><div className="font-semibold">{row.asset_name}</div><div className="text-[10px] text-slate-400">{row.asset_code}</div></div></td>
                  <td className="px-4 py-3">{row.frequency}</td>
                  <td className="px-4 py-3 font-semibold">{formatDate(row.next_due_date)}</td>
                  <td className="px-4 py-3">{row.assigned_to_name || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${isOverdue ? 'bg-red-100 text-red-800 border-red-200' : row.due_status === 'Due Today' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{row.due_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {hasPermission('maintenance', 'edit') && <button onClick={() => openLog(row)} className="text-white text-xs font-semibold bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">Log Completion</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Schedule">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Frequency *</label>
              <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                {['Daily','Weekly','Monthly','Quarterly','Annually'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">First Due Date *</label>
              <input type="date" required value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Technician</label>
            <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="">Select Technician</option>
              {employees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role_name || 'User'})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Schedule</button>
          </div>
        </form>
      </Modal>

      {/* Log Modal */}
      <Modal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} title={`Log Completion: ${selectedSchedule?.asset_name}`}>
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks / Checklist notes *</label>
            <textarea required value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={3} placeholder="Describe inspection result, replacement parts..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Override Next Due Date (leave blank to auto-calculate)</label>
            <input type="date" value={logForm.next_due_date} onChange={e => setLogForm(p => ({ ...p, next_due_date: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsLogOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 font-bold">Complete & Reschedule</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SchedulesPage;
