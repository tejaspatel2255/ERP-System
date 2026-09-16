import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
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
    { key: 'wo_no', label: 'Work Order' },
    { key: 'inspector_name', label: 'Inspector', render: i => i.inspector_name || '—' },
    { key: 'inspection_date', label: 'Date', render: i => formatDate(i.inspection_date) },
    { key: 'result', label: 'Final Result', render: i => {
      let cls = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (i.result === 'Pass' || i.result === 'Approved') cls = 'bg-green-100 text-green-800 border-green-200';
      if (i.result === 'Fail' || i.result === 'Rejected') cls = 'bg-red-100 text-red-800 border-red-200 font-bold';
      return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cls}`}>{i.result || 'Pending'}</span>;
    }},
    { key: 'actions', label: 'Actions', render: i => {
      if (i.result === 'Pending' || !i.result) {
        return (
          <div className="flex gap-2">
            <button onClick={() => handleApprove(i.id, 'Pass')} className="px-2.5 py-1 text-xs font-semibold bg-accent-success/20 text-accent-success hover:bg-accent-success hover:text-white rounded-lg transition-colors">
              Pass & Stock IN
            </button>
            <button onClick={() => handleApprove(i.id, 'Fail')} className="px-2.5 py-1 text-xs font-semibold bg-accent-danger/20 text-accent-danger hover:bg-accent-danger hover:text-white rounded-lg transition-colors">
              Fail (NCR)
            </button>
          </div>
        );
      }
      return <span className="text-xs text-text-muted">Completed</span>;
    }}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Final Product Inspection (QC)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Perform final inspections on completed Work Orders. Approval is required prior to dispatch release.</p>
        </div>
        {hasPermission('qc', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Log Final QC</button>}
      </div>

      <Table columns={columns} data={records} loading={loading} emptyMessage="No final product inspections logged." />

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Final Product QC">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Completed Work Order *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} (item: {w.finished_item_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Result *</label>
            <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="Approved">Approved (Pass for dispatch)</option>
              <option value="Rejected">Rejected (Block release)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Inspector Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={2} placeholder="Verification checklist outcomes, final testing parameters..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Submit QC Log</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinalQCPage;
