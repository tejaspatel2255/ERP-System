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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-fadeIn font-sans">
      <PageHeader
        title="Plant Maintenance Kanban Control"
        description="Monitor machine breakdowns, track active repair pipelines, and manage preventive asset tickets."
        actions={
          hasPermission('maintenance', 'create') && (
            <button onClick={openCreate} className="rounded-xs bg-accent-primary px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-accent-secondary transition-all shadow-2xs">
              + Raise Maintenance Ticket
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['Open', 'In Progress', 'Resolved'].map(col => (
          <div key={col} className="bg-bg-card p-3 rounded-xs border border-border-color flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-3 border-b border-border-color pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-primary" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-text-primary">{col}</h3>
              </div>
              <span className="bg-bg-secondary text-accent-primary font-mono text-[10px] font-bold px-2 py-0.5 rounded-xs border border-border-color">{getIssuesByStatus(col).length}</span>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
              {getIssuesByStatus(col).map(issue => (
                <div key={issue.id} className="bg-bg-secondary p-3 rounded-xs border border-border-color shadow-2xs hover:border-accent-primary/50 transition-colors">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-accent-primary truncate">{issue.asset_name}</span>
                    <StatusBadge status={issue.priority} />
                  </div>
                  <p className="text-xs font-sans text-text-primary mb-2 leading-relaxed">{issue.description}</p>
                  <div className="text-[10px] font-mono text-text-muted mb-3">Technician: {issue.assigned_to_name || 'Unassigned'}</div>
                  <div className="flex gap-1.5 justify-end pt-2 border-t border-border-color/50">
                    {col !== 'Open' && <button onClick={() => handleUpdateStatus(issue, col === 'In Progress' ? 'Open' : 'In Progress')} className="text-[10px] font-mono font-bold text-text-muted hover:text-text-primary bg-bg-card border border-border-color px-2 py-1 rounded-xs transition-colors uppercase">← Back</button>}
                    {col !== 'Resolved' && <button onClick={() => handleUpdateStatus(issue, 'Open' === col ? 'In Progress' : 'Resolved')} className="text-[10px] font-mono font-bold text-accent-primary hover:text-accent-secondary bg-bg-card border border-border-color px-2 py-1 rounded-xs transition-colors uppercase">Advance →</button>}
                    {col === 'Resolved' && <button onClick={() => handleUpdateStatus(issue, 'Closed')} className="text-[10px] font-mono font-bold text-accent-success hover:text-accent-success/80 bg-bg-card border border-border-color px-2 py-1 rounded-xs transition-colors uppercase">✓ Close Ticket</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Raise Issue Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Raise Maintenance Ticket">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Target Asset *</label>
            <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary">
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Defect Telemetry Description *</label>
            <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary" rows={3} placeholder="Describe symptom, abnormal vibration, pressure drop, breakdown..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Severity Priority *</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary">
                {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Assign Technician</label>
              <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary">
                <option value="">Select Technician</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xs border border-border-color bg-bg-card px-3.5 py-1.5 text-xs font-mono font-bold uppercase text-text-secondary hover:bg-bg-hover">Cancel</button>
            <button type="submit" className="rounded-xs bg-accent-primary px-4 py-1.5 text-xs font-mono font-bold uppercase text-white hover:bg-accent-secondary shadow-2xs">Raise Ticket</button>
          </div>
        </form>
      </Modal>

      {/* Resolve Issue Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Close / Resolve Maintenance Ticket">
        <form onSubmit={handleResolveSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Ticket Resolution Status</label>
            <select value={resolveForm.status} onChange={e => setResolveForm(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary">
              <option value="Resolved">Resolved (pending closure verification)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Resolution Actions & Engineering Notes *</label>
            <textarea required value={resolveForm.resolution_notes} onChange={e => setResolveForm(p => ({ ...p, resolution_notes: e.target.value }))} className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary" rows={3} placeholder="Describe root cause and corrective action (e.g., bearing alignment, seal replacement)..." />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-color">
            <button type="button" onClick={() => setIsResolveOpen(false)} className="rounded-xs border border-border-color bg-bg-card px-3.5 py-1.5 text-xs font-mono font-bold uppercase text-text-secondary hover:bg-bg-hover">Cancel</button>
            <button type="submit" className="rounded-xs bg-accent-success px-4 py-1.5 text-xs font-mono font-bold uppercase text-white hover:bg-accent-success/90 shadow-2xs">Save Resolution</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IssuesPage;
