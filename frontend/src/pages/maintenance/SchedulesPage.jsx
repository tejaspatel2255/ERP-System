import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Maintenance Schedules"
        subtitle="Preventative maintenance planning and schedule execution tracking."
        actions={
          hasPermission('maintenance', 'create') && <button onClick={openCreate} className="btn-primary">+ Add Schedule</button>
        }
      />

      <div className="sheet p-3 flex gap-2 items-center">
        <select value={dueFilter} onChange={e => setDueFilter(e.target.value)} className="field md:w-52">
          <option value="">All Schedules</option>
          <option value="week">Due This Week</option>
          <option value="month">Due This Month</option>
        </select>
      </div>

      <div className="sheet overflow-x-auto">
        <table className="bom w-full text-sm text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Next Due Date</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-text-muted">Loading schedules...</td></tr>
            ) : schedules.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-text-muted">No maintenance schedules found.</td></tr>
            ) : schedules.map(row => {
              const isOverdue = row.due_status === 'Overdue';
              return (
                <tr key={row.id} className={`bom-row ${isOverdue ? 'bg-[var(--danger-bg)]' : ''}`}>
                  <td className="px-4 py-3"><div><div className="font-medium text-text-primary">{row.asset_name}</div><div className="text-xs text-text-muted"><span className="stamp">{row.asset_code}</span></div></div></td>
                  <td className="px-4 py-3">{row.frequency}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{formatDate(row.next_due_date)}</td>
                  <td className="px-4 py-3">{row.assigned_to_name || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.due_status} />
                  </td>
                  <td className="px-4 py-3">
                    {hasPermission('maintenance', 'edit') && <button onClick={() => openLog(row)} className="btn-primary btn-xs">Log Completion</button>}
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="field">
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Frequency *</label>
              <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className="field">
                {['Daily','Weekly','Monthly','Quarterly','Annually'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">First Due Date *</label>
              <input type="date" required value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} className="field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Assigned Technician</label>
            <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="field">
              <option value="">Select Technician</option>
              {employees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role_name || 'User'})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Schedule</button>
          </div>
        </form>
      </Modal>

      {/* Log Modal */}
      <Modal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} title={`Log Completion: ${selectedSchedule?.asset_name}`}>
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Remarks / Checklist notes *</label>
            <textarea required value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} className="field" rows={3} placeholder="Describe inspection result, replacement parts..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Override Next Due Date (leave blank to auto-calculate)</label>
            <input type="date" value={logForm.next_due_date} onChange={e => setLogForm(p => ({ ...p, next_due_date: e.target.value }))} className="field" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsLogOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Complete & Reschedule</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SchedulesPage;