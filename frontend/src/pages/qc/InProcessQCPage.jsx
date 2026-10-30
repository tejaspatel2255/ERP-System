import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getInProcessQC, createInProcessQC } from '../../api/qcApi';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';

const InProcessQCPage = () => {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState([]);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({ work_order_id: '', stage: '', result: 'Approved', notes: '' });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInProcessQC();
      if (d.success) setRecords(d.records);
    } catch { toast.error('Failed to load in-process QC records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRecords();
    getWorkOrders().then(d => { if (d.success) setWos(d.workOrders.filter(w => w.status === 'In Progress')); }).catch(() => {});
  }, [fetchRecords]);

  const openCreate = () => {
    setForm({ work_order_id: wos[0]?.id || '', stage: '', result: 'Approved', notes: '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.stage.trim()) return toast.error('Enter the production stage inspected.');
    try {
      const d = await createInProcessQC(form);
      if (d.success) {
        toast.success(`In-process stage inspection recorded.${form.result === 'Rejected' ? ' NCR raised!' : ''}`);
        setIsFormOpen(false);
        fetchRecords();
      }
    } catch { toast.error('Log failed.'); }
  };

  const columns = [
    { key: 'wo_no', label: 'Work Order', render: i => <span className="font-mono font-bold text-accent-primary">{i.wo_no}</span> },
    { key: 'stage', label: 'Production Stage', render: i => <span className="font-medium text-text-primary">{i.stage}</span> },
    { key: 'inspector_name', label: 'Inspector', render: i => <span className="text-xs text-text-muted">{i.inspector_name || '—'}</span> },
    { key: 'inspection_date', label: 'Inspection Date', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.inspection_date)}</span> },
    { key: 'result', label: 'Result', render: i => <StatusBadge status={i.result} /> },
    { key: 'notes', label: 'Notes', render: i => <span className="text-xs text-text-muted">{i.notes || '—'}</span> }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="In-Process Stage QC"
        description="Perform inspections at intermediate work order stages (e.g. cutting, welding, assembly) to prevent defect propagation."
        actions={
          hasPermission('qc', 'create') && (
            <button onClick={openCreate} className="btn btn-primary text-xs uppercase tracking-wider font-mono">
              + Log In-Process QC
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={records} loading={loading} emptyMessage="No in-process inspections logged." />
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Stage In-Process Inspection">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Active Work Order *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="field w-full">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} ({w.finished_item_name})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Stage Name *</label>
              <input required value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))} className="field w-full" placeholder="e.g. Assembly-Stage" />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Result *</label>
              <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="field w-full">
                <option value="Approved">Approved</option>
                <option value="Rework">Rework</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Inspector Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field w-full" rows={2} placeholder="Verification checklist outcomes, specs matching, dimensions..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn btn-primary text-xs">Submit QC Log</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InProcessQCPage;
