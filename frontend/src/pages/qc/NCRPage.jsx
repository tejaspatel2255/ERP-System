import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getNCRs, updateNCR } from '../../api/qcApi';
import { formatDate } from '../../utils/formatDate';

const NCRPage = () => {
  const { hasPermission } = useRole();
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState(null);

  const [form, setForm] = useState({ root_cause: '', corrective_action: '', status: 'Open' });

  const fetchNCRs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getNCRs();
      if (d.success) setNcrs(d.ncrs);
    } catch { toast.error('Failed to load NCR records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNCRs(); }, [fetchNCRs]);

  const openDetail = (ncr) => {
    setSelectedNcr(ncr);
    setForm({
      root_cause: ncr.root_cause || '',
      corrective_action: ncr.corrective_action || '',
      status: ncr.status
    });
    setIsDetailOpen(true);
  };

  const handleUpdateNCR = async (e) => {
    e.preventDefault();
    try {
      await updateNCR(selectedNcr.id, form);
      toast.success('NCR updated successfully.');
      setIsDetailOpen(false);
      fetchNCRs();
    } catch {
      toast.error('Failed to update NCR.');
    }
  };

  const columns = [
    { key: 'ncr_no', label: 'NCR No', render: i => <span className="font-mono font-bold text-accent-danger">{i.ncr_no}</span> },
    { key: 'source_type', label: 'QC Source', render: i => {
      const label = i.source_type === 'raw' ? 'Inward Raw' : i.source_type === 'in_process' ? 'In-Process' : 'Final Product';
      return <StatusBadge status={label} />;
    }},
    { key: 'defect_description', label: 'Defect Description', render: i => <p className="truncate max-w-xs text-xs text-text-primary">{i.defect_description}</p> },
    { key: 'raised_by_name', label: 'Raised By', render: i => <span className="text-xs text-text-muted">{i.raised_by_name || 'System'}</span> },
    { key: 'raised_at', label: 'Raised At', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.raised_at)}</span> },
    { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
    { key: 'actions', label: 'Actions', render: i => (
      <button onClick={() => openDetail(i)} className="btn btn-secondary text-xs py-1 px-2.5">
        Review NCR
      </button>
    )}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Non-Conformance Reports (NCR)"
        description="Manage defects raised from raw material, in-process, or final QC failure. Formulate root cause analysis and corrective actions."
      />

      <div className="sheet">
        <Table columns={columns} data={ncrs} loading={loading} emptyMessage="No Non-Conformance Reports registered." />
      </div>

      {/* NCR Review Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Review NCR: ${selectedNcr?.ncr_no}`} size="lg">
        {selectedNcr && (
          <form onSubmit={handleUpdateNCR} className="space-y-4">
            <div className="p-3 bg-bg-surface rounded-xs border border-border-color text-xs text-text-secondary space-y-1 mb-4 font-mono">
              <div><strong className="text-text-primary">Raised At:</strong> {formatDate(selectedNcr.raised_at)}</div>
              <div><strong className="text-text-primary">Reported Defect:</strong> {selectedNcr.defect_description}</div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Root Cause Analysis *</label>
              <textarea required value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} className="field w-full" rows={3} placeholder="Identify why the failure happened..." />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Corrective / Preventive Actions *</label>
              <textarea required value={form.corrective_action} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} className="field w-full" rows={3} placeholder="Describe containment actions, machine calibration or process changes taken..." />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Status Flow</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="field w-full">
                <option value="Open">Open (Analysis In Progress)</option>
                <option value="Action Taken">Action Taken (Verifying)</option>
                <option value="Closed">Closed (Resolved)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button type="button" onClick={() => setIsDetailOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
              {hasPermission('qc', 'edit') && <button type="submit" className="btn btn-primary text-xs">Save Resolution</button>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default NCRPage;
