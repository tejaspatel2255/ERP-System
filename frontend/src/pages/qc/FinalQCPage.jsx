import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getFinalQC, approveFinalQC } from '../../api/qcApi';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';

const FinalQCPage = () => {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState([]);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({ work_order_id: '', result: 'Pass', notes: '' });

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
    setForm({ work_order_id: wos[0]?.id || '', result: 'Pass', notes: '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const record = records.find(r => r.work_order_id === form.work_order_id && r.wo_qc_status === 'Pending');
      if (!record) return toast.error('No pending final QC record exists for this work order.');
      const d = await approveFinalQC(form.work_order_id, { result: form.result, notes: form.notes });
      if (d.success) {
        toast.success(`Final QC ${form.result === 'Fail' ? 'failed; NCR generated.' : 'passed; stock updated.'}`);
        setIsFormOpen(false);
        fetchRecords();
      }
    } catch { toast.error('Log failed.'); }
  };

  const columns = [
    { key: 'wo_no', label: 'Work Order', render: i => <span className="stamp">{i.wo_no}</span> },
    { key: 'inspector_name', label: 'Inspector', render: i => i.inspector_name || '—' },
    { key: 'inspection_date', label: 'Date', render: i => <span className="tabular-nums">{formatDate(i.inspection_date)}</span> },
    { key: 'result', label: 'Final Result', render: i => {
      const status = i.wo_qc_status === 'Passed' ? 'Pass' : i.wo_qc_status === 'Failed' ? 'Fail' : 'Pending';
      return <StatusBadge status={status} />;
    }},
    { key: 'notes', label: 'Notes', render: i => i.notes || '—' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Final Product Inspection (QC)"
        subtitle="Perform final inspections on completed Work Orders. Approval is required prior to dispatch release."
        actions={
          hasPermission('qc', 'create') && <button onClick={openCreate} className="btn-primary">Log Final QC</button>
        }
      />

      <Table columns={columns} data={records} loading={loading} emptyMessage="No final product inspections logged." />

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Final Product QC">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Completed Work Order *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="field">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} (item: {w.finished_item_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Result *</label>
            <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="field">
              <option value="Pass">Pass (Add to stock)</option>
              <option value="Fail">Fail (Block release)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Inspector Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field" rows={2} placeholder="Verification checklist outcomes, final testing parameters..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className={form.result === 'Pass' ? 'btn-primary' : 'btn-danger'}>Submit QC Log</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinalQCPage;