import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getIssues, createIssue, updateIssue, getAssets } from '../../api/maintenanceApi';
import axiosInstance from '../../api/axiosInstance';

const PRIORITY_COLOR = {
  'Low': 'bg-blue-100 text-blue-800 border-blue-200',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'High': 'bg-orange-100 text-orange-800 border-orange-200',
  'Critical': 'bg-red-100 text-red-800 border-red-200 font-bold'
};

const IssuesPage = () => {
  const { hasPermission } = useRole();
  const [issues, setIssues] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [form, setForm] = useState({ asset_id: '', description: '', priority: 'Medium', assigned_to: '' });
  const [resolveForm, setResolveForm] = useState({ resolution_notes: '', status: 'Resolved' });

  const fetchIssues = async () => {
    try {
      const d = await getIssues();
      if (d.success) setIssues(d.issues);
    } catch { toast.error('Failed to load issues.'); }
  };

  useEffect(() => {
    fetchIssues();
    getAssets().then(d => { if (d.success) setAssets(d.assets); }).catch(() => {});
    axiosInstance.get('/users').then(r => { if (r.data.success) setEmployees(r.data.users); }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ asset_id: assets[0]?.id || '', description: '', priority: 'Medium', assigned_to: '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createIssue(form);
      toast.success('Issue logged.');
      setIsFormOpen(false);
      fetchIssues();
    } catch { toast.error('Failed to log issue.'); }
  };

  const handleUpdateStatus = async (issue, newStatus) => {
    if (newStatus === 'Resolved') {
      setSelectedIssue(issue);
      setResolveForm({ resolution_notes: '', status: 'Resolved' });
      setIsResolveOpen(true);
      return;
    }
    try {
      const d = await updateIssue(issue.id, { status: newStatus, priority: issue.priority, assigned_to: issue.assigned_to });
      if (d.warning) toast.error(d.warning);
      toast.success(`Status updated to ${newStatus}.`);
      fetchIssues();
    } catch { toast.error('Failed to update status.'); }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    try {
      const d = await updateIssue(selectedIssue.id, { status: resolveForm.status, priority: selectedIssue.priority, assigned_to: selectedIssue.assigned_to, resolution_notes: resolveForm.resolution_notes });
      if (d.warning) toast.error(d.warning);
      toast.success('Issue status updated.');
      setIsResolveOpen(false);
      fetchIssues();
    } catch { toast.error('Failed to update issue.'); }
  };

  const getIssuesByStatus = (status) => issues.filter(i => i.status === status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Maintenance Kanban Board</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track and update active breakdowns, repairs, and scheduled issues.</p>
        </div>
        {hasPermission('maintenance', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Raise Issue</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['Open', 'In Progress', 'Resolved'].map(col => (
          <div key={col} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-300">{col}</h3>
              <span className="bg-slate-200 dark:bg-slate-800 text-xs font-semibold px-2 py-0.5 rounded-full">{getIssuesByStatus(col).length}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {getIssuesByStatus(col).map(issue => (
                <div key={issue.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500">{issue.asset_name}</span>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold border ${PRIORITY_COLOR[issue.priority] || ''}`}>{issue.priority}</span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 mb-3">{issue.description}</p>
                  <div className="text-[10px] text-slate-400 mb-4">Assigned to: {issue.assigned_to_name || 'Unassigned'}</div>
                  <div className="flex gap-1 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    {col !== 'Open' && <button onClick={() => handleUpdateStatus(issue, col === 'In Progress' ? 'Open' : 'In Progress')} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 px-2 py-1 rounded">← Back</button>}
                    {col !== 'Resolved' && <button onClick={() => handleUpdateStatus(issue, col === 'Open' ? 'In Progress' : 'Resolved')} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">Advance →</button>}
                    {col === 'Resolved' && <button onClick={() => handleUpdateStatus(issue, 'Closed')} className="text-[10px] font-semibold text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded">✓ Close</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Raise Issue Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Raise Maintenance Ticket">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Defect Description *</label>
            <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={3} placeholder="Describe the symptom, leak, noise, breakdown..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority *</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="">Select Technician</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 font-bold">Raise Ticket</button>
          </div>
        </form>
      </Modal>

      {/* Resolve Issue Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Close / Resolve Ticket">
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select value={resolveForm.status} onChange={e => setResolveForm(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="Resolved">Resolved (pending closure confirmation)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolution Actions / Notes *</label>
            <textarea required value={resolveForm.resolution_notes} onChange={e => setResolveForm(p => ({ ...p, resolution_notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={3} placeholder="Describe root cause and fixing action (e.g. replaced worn belt)..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsResolveOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">Save Resolution</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IssuesPage;
