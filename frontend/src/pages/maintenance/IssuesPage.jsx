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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Plant Maintenance Kanban Control"
        description="Monitor machine breakdowns, track active repair pipelines, and manage preventive asset tickets."
        actions={
          hasPermission('maintenance', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Raise Maintenance Ticket
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {['Open', 'In Progress', 'Resolved'].map(col => (
          <div key={col} className="sheet p-4 flex flex-col min-h-[500px] space-y-3">
            <div className="flex justify-between items-center border-b border-border-color pb-2.5">
              <div className="flex items-center gap-2">
                <span className={`lamp ${col === 'Open' ? 'lamp-danger' : col === 'In Progress' ? 'lamp-accent' : 'lamp-success'}`} />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">{col}</h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 sheet bg-bg-secondary text-text-primary">
                {getIssuesByStatus(col).length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {getIssuesByStatus(col).map(issue => (
                <div key={issue.id} className="sheet bg-bg-secondary p-3.5 space-y-2 hover:border-accent-primary/60 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-mono font-bold text-accent-primary truncate">{issue.asset_name}</span>
                    <StatusBadge status={issue.priority} />
                  </div>
                  <p className="text-xs font-sans text-text-primary leading-relaxed">{issue.description}</p>
                  <div className="text-[11px] font-mono text-text-muted">Technician: {issue.assigned_to_name || 'Unassigned'}</div>
                  <div className="flex gap-1.5 justify-end pt-2 border-t border-border-color">
                    {col !== 'Open' && (
                      <button
                        onClick={() => handleUpdateStatus(issue, col === 'In Progress' ? 'Open' : 'In Progress')}
                        className="btn btn-ghost px-2 py-1 text-[10px] font-mono uppercase tracking-wider"
                      >
                        ← Back
                      </button>
                    )}
                    {col !== 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(issue, 'Open' === col ? 'In Progress' : 'Resolved')}
                        className="btn btn-primary px-2 py-1 text-[10px] font-mono uppercase tracking-wider"
                      >
                        Advance →
                      </button>
                    )}
                    {col === 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(issue, 'Closed')}
                        className="btn btn-primary px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
                      >
                        ✓ Close Ticket
                      </button>
                    )}
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
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Target Asset *</label>
            <select
              value={form.asset_id}
              onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}
              className="field font-sans"
            >
              <option value="" disabled>Select Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Defect Telemetry Description *</label>
            <textarea
              required
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="field font-sans"
              rows={3}
              placeholder="Describe symptom, abnormal vibration, pressure drop, breakdown..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Severity Priority *</label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="field font-sans"
              >
                {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Assign Technician</label>
              <select
                value={form.assigned_to}
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                className="field font-sans"
              >
                <option value="">Select Technician</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Raise Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Issue Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Close / Resolve Maintenance Ticket">
        <form onSubmit={handleResolveSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Ticket Resolution Status</label>
            <select
              value={resolveForm.status}
              onChange={e => setResolveForm(p => ({ ...p, status: e.target.value }))}
              className="field font-sans"
            >
              <option value="Resolved">Resolved (pending closure verification)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Resolution Actions & Engineering Notes *</label>
            <textarea
              required
              value={resolveForm.resolution_notes}
              onChange={e => setResolveForm(p => ({ ...p, resolution_notes: e.target.value }))}
              className="field font-sans"
              rows={3}
              placeholder="Describe root cause and corrective action (e.g., bearing alignment, seal replacement)..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsResolveOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IssuesPage;
