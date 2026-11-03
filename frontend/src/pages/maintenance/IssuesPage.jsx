import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getIssues, createIssue, updateIssue, getAssets } from '../../api/maintenanceApi';
import axiosInstance from '../../api/axiosInstance';

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

  const getPriorityRailClass = (priority) => {
    if (priority === 'Critical') return 'border-l-[3px] border-l-[var(--danger-rail)]';
    if (priority === 'High') return 'border-l-[3px] border-l-[var(--warning-rail)]';
    return 'border-l-[3px] border-l-[var(--info-rail)]';
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Maintenance Kanban Board"
        subtitle="Track and update active breakdowns, repairs, and scheduled issues."
        actions={
          hasPermission('maintenance', 'create') && <button onClick={openCreate} className="btn-primary">Raise Issue</button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['Open', 'In Progress', 'Resolved'].map(col => (
          <div key={col} className="rounded-lg bg-bg-secondary border border-border-color p-3 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-text-primary">{col}</h3>
              <span className="tb-cell">{getIssuesByStatus(col).length}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {getIssuesByStatus(col).map(issue => (
                <div key={issue.id} className={`sheet p-3 space-y-2.5 ${getPriorityRailClass(issue.priority)}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold text-text-secondary">{issue.asset_name}</span>
                    <StatusBadge status={issue.priority} />
                  </div>
                  <p className="text-sm text-text-primary">{issue.description}</p>
                  <div className="text-xs text-text-muted">Assigned to: {issue.assigned_to_name || 'Unassigned'}</div>
                  <div className="flex gap-1.5 justify-end pt-2 border-t border-border-color">
                    {col !== 'Open' && <button onClick={() => handleUpdateStatus(issue, col === 'In Progress' ? 'Open' : 'In Progress')} className="btn-secondary btn-xs">← Back</button>}
                    {col !== 'Resolved' && <button onClick={() => handleUpdateStatus(issue, col === 'Open' ? 'In Progress' : 'Resolved')} className="btn-primary btn-xs">Advance →</button>}
                    {col === 'Resolved' && <button onClick={() => handleUpdateStatus(issue, 'Closed')} className="btn-secondary btn-xs text-[var(--success-text)] hover:border-[var(--success-border)]">✓ Close</button>}
                  </div>
                </div>
              ))}
              {getIssuesByStatus(col).length === 0 && (
                <div className="py-12 text-center text-xs text-text-muted">No tickets in this lane</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Raise Issue Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Raise Maintenance Ticket">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="field">
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Defect Description *</label>
            <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="field" rows={3} placeholder="Describe the symptom, leak, noise, breakdown..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Priority *</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="field">
                {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="field">
                <option value="">Select Technician</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Raise Ticket</button>
          </div>
        </form>
      </Modal>

      {/* Resolve Issue Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Close / Resolve Ticket">
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
            <select value={resolveForm.status} onChange={e => setResolveForm(p => ({ ...p, status: e.target.value }))} className="field">
              <option value="Resolved">Resolved (pending closure confirmation)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Resolution Actions / Notes *</label>
            <textarea required value={resolveForm.resolution_notes} onChange={e => setResolveForm(p => ({ ...p, resolution_notes: e.target.value }))} className="field" rows={3} placeholder="Describe root cause and fixing action (e.g. replaced worn belt)..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsResolveOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Resolution</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IssuesPage;