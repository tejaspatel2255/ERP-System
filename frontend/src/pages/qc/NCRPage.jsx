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
    { key: 'ncr_no', label: 'NCR No', render: i => <span className="stamp">{i.ncr_no}</span> },
    { key: 'source_type', label: 'QC Source', render: i => {
      const label = i.source_type === 'raw' ? 'Inward Raw' : i.source_type === 'in_process' ? 'In-Process' : 'Final Product';
      return <StatusBadge status={label} />;
    }},
    { key: 'defect_description', label: 'Defect Description', render: i => <p className="truncate max-w-xs">{i.defect_description}</p> },
    { key: 'raised_by_name', label: 'Raised By', render: i => i.raised_by_name || 'System' },
    { key: 'raised_at', label: 'Raised At', render: i => <span className="tabular-nums">{formatDate(i.raised_at)}</span> },
    { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
    { key: 'actions', label: 'Actions', render: i => <button onClick={() => openDetail(i)} className="btn-secondary btn-xs">Review NCR</button> }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Non-Conformance Reports (NCR)"
        subtitle="Manage defects raised from raw material, in-process, or final QC failure. Implement corrective actions."
      />

      <Table columns={columns} data={ncrs} loading={loading} emptyMessage="No Non-Conformance Reports registered." />

      {/* NCR Review Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Review NCR: ${selectedNcr?.ncr_no}`} size="lg">
        {selectedNcr && (
          <form onSubmit={handleUpdateNCR} className="space-y-4">
            <div className="p-3 sheet text-xs space-y-1 mb-4">
              <div><strong className="text-text-primary">Raised At:</strong> <span className="tabular-nums">{formatDate(selectedNcr.raised_at)}</span></div>
              <div><strong className="text-text-primary">Reported Defect:</strong> {selectedNcr.defect_description}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Root Cause Analysis *</label>
              <textarea required value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} className="field" rows={3} placeholder="Identify why the failure happened..." />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Corrective / Preventive Actions *</label>
              <textarea required value={form.corrective_action} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} className="field" rows={3} placeholder="Describe containment actions, machine calibration or process changes taken..." />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status Flow</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="field">
                <option value="Open">Open (Analysis In Progress)</option>
                <option value="Action Taken">Action Taken (Verifying)</option>
                <option value="Closed">Closed (Resolved)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button type="button" onClick={() => setIsDetailOpen(false)} className="btn-secondary">Cancel</button>
              {hasPermission('qc', 'edit') && <button type="submit" className="btn-primary">Save Resolution</button>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default NCRPage;