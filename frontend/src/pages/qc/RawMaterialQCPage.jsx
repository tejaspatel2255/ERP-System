import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getRawMaterialQC, createRawMaterialQC } from '../../api/qcApi';
import { getGRNs, getGRNById } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';

const RawMaterialQCPage = () => {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState([]);
  const [grns, setGrns] = useState([]);
  const [grnItems, setGrnItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({ grn_id: '', item_id: '', result: 'Approved', rejection_qty: '0', notes: '' });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getRawMaterialQC();
      if (d.success) setRecords(d.records);
    } catch { toast.error('Failed to load raw material QC records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRecords();
    getGRNs().then(g => {
      if (g.success) setGrns(g.grns);
    }).catch(() => {});
  }, [fetchRecords]);

  const handleGRNChange = async (grnId) => {
    setForm(p => ({ ...p, grn_id: grnId, item_id: '' }));
    try {
      const d = await getGRNById(grnId);
      if (d.success) setGrnItems(d.items);
    } catch { toast.error('Failed to load GRN items.'); }
  };

  const openCreate = () => {
    setForm({ grn_id: grns[0]?.id || '', item_id: '', result: 'Approved', rejection_qty: '0', notes: '' });
    setGrnItems([]);
    if (grns[0]?.id) handleGRNChange(grns[0].id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_id) return toast.error('Select an item to inspect.');
    try {
      const d = await createRawMaterialQC(form);
      if (d.success) {
        toast.success(`QC recorded.${form.result === 'Rejected' ? ' NCR automatically raised!' : ''}`);
        setIsFormOpen(false);
        fetchRecords();
      }
    } catch (err) {
      toast.error('QC log failed.');
    }
  };

  const columns = [
    { key: 'grn_no', label: 'GRN No' },
    { key: 'item_name', label: 'Raw Material Item', render: i => <div><div className="font-semibold">{i.item_name}</div><div className="text-[10px] text-slate-400">{i.item_code}</div></div> },
    { key: 'inspector_name', label: 'Inspector', render: i => i.inspector_name || '—' },
    { key: 'inspection_date', label: 'Date', render: i => formatDate(i.inspection_date) },
    { key: 'result', label: 'Inspection Result', render: i => {
      const cls = i.result === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200 font-bold';
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${cls}`}>{i.result}</span>;
    }},
    { key: 'rejection_qty', label: 'Rejected Qty', render: i => parseFloat(i.rejection_qty) },
    { key: 'notes', label: 'Notes', render: i => i.notes || '—' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Inward Raw Material QC</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Perform quality checks on incoming store vendor shipments (GRNs) before stocking.</p>
        </div>
        {hasPermission('qc', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Log GRN QC</button>}
      </div>

      <Table columns={columns} data={records} loading={loading} emptyMessage="No raw material inspections logged." />

      {/* QC Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Raw Material QC Inspection">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select GRN *</label>
            <select value={form.grn_id} onChange={e => handleGRNChange(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select GRN</option>
              {grns.map(g => <option key={g.id} value={g.id}>{g.grn_no} (date: {formatDate(g.received_date)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Item to inspect *</label>
            <select value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="">— Select Item —</option>
              {grnItems.map(i => <option key={i.item_id} value={i.item_id}>{i.item_name} (received: {parseFloat(i.received_qty)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Result *</label>
              <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="Approved">Approved (Add to stock)</option>
                <option value="Rejected">Rejected (Isolate / Gate Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Rejection Qty (if failed)</label>
              <input type="number" min="0" step="any" value={form.rejection_qty} onChange={e => setForm(p => ({ ...p, rejection_qty: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Inspection Comments</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={2} placeholder="Physical damage, gauge thickness test results..." />
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

export default RawMaterialQCPage;
