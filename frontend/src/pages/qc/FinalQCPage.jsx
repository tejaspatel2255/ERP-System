import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getFinalQC, createFinalQC, approveFinalQC } from '../../api/qcApi';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';

const FinalQCPage = () => {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState([]);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({ work_order_id: '', result: 'Approved', notes: '' });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getFinalQC();
      if (d.success) setRecords(d.records);
    } catch { toast.error('Failed to load final QC records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRecords();
    getWorkOrders().then(d => { if (d.success) setWos(d.workOrders.filter(w => w.status === 'Completed')); }).catch(() => {});
  }, [fetchRecords]);

  const openCreate = () => {
    setForm({ work_order_id: wos[0]?.id || '', result: 'Approved', notes: '' });
    setIsFormOpen(true);
  };

  const handleApprove = async (id, result) => {
    try {
      const res = await approveFinalQC(id, { result });
      if (res.success) {
        toast.success(`Final QC updated to ${result}!`);
        fetchRecords();
      }
    } catch {
      toast.error('Failed to update Final QC status.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const d = await createFinalQC(form);
      if (d.success) {
        toast.success(`Final QC inspection recorded.${form.result === 'Rejected' ? ' NCR generated & Dispatch blocked.' : ''}`);
        setIsFormOpen(false);
        fetchRecords();
      }
    } catch { toast.error('Log failed.'); }
  };

  const columns = [
    { key: 'wo_no', label: 'Work Order', render: i => <span className="font-mono font-bold text-accent-primary">{i.wo_no}</span> },
    { key: 'inspector_name', label: 'Inspector', render: i => <span className="text-xs text-text-muted">{i.inspector_name || '—'}</span> },
    { key: 'inspection_date', label: 'Date', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.inspection_date)}</span> },
    { key: 'result', label: 'Final Result', render: i => <StatusBadge status={i.result || 'Pending'} /> },
    { key: 'actions', label: 'Actions', render: i => {
      if (i.result === 'Pending' || !i.result) {
        return (
          <div className="flex gap-2">
            <button onClick={() => handleApprove(i.id, 'Pass')} className="btn btn-primary text-xs py-1 px-2.5">
              Pass & Stock IN
            </button>
            <button onClick={() => handleApprove(i.id, 'Fail')} className="btn btn-danger text-xs py-1 px-2.5">
              Fail (NCR)
            </button>
          </div>
        );
      }
      return <span className="text-xs font-mono text-text-muted uppercase">Completed</span>;
    }}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Final Product Inspection (QC)"
        description="Perform final inspections on completed Work Orders. Approval is required prior to dispatch release."
        actions={
          hasPermission('qc', 'create') && (
            <button onClick={openCreate} className="btn btn-primary text-xs uppercase tracking-wider font-mono">
              + Log Final QC
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={records} loading={loading} emptyMessage="No final product inspections logged." />
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Final Product QC">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Completed Work Order *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="field w-full">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} ({w.finished_item_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Result *</label>
            <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="field w-full">
              <option value="Approved">Approved (Pass for dispatch)</option>
              <option value="Rejected">Rejected (Block release)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Inspector Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field w-full" rows={2} placeholder="Verification checklist outcomes, final testing parameters..." />
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

export default FinalQCPage;
