import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getRawMaterialQC, approveRawMaterialQC } from '../../api/qcApi';
import { getGRNs, getGRNById } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';

const RawMaterialQCPage = () => {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState([]);
  const [grns, setGrns] = useState([]);
  const [grnItems, setGrnItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState({ grn_id: '', item_id: '', result: 'Pass', rejection_qty: '0', notes: '' });

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
    setForm({ grn_id: grns[0]?.id || '', item_id: '', result: 'Pass', rejection_qty: '0', notes: '' });
    setGrnItems([]);
    if (grns[0]?.id) handleGRNChange(grns[0].id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_id) return toast.error('Select an item to inspect.');
    try {
      const record = records.find(r => r.grn_id === form.grn_id && r.item_id === form.item_id && r.qc_status === 'Pending');
      if (!record) return toast.error('No pending QC record exists for this GRN item.');
      const d = await approveRawMaterialQC(record.id, { result: form.result, notes: form.notes });
      if (d.success) {
        toast.success(`QC ${form.result === 'Fail' ? 'failed; NCR automatically raised.' : 'passed; stock updated.'}`);
        setIsFormOpen(false);
        fetchRecords();
      }
    } catch (err) {
      toast.error('QC log failed.');
    }
  };

  const columns = [
    { key: 'grn_no', label: 'GRN No', render: i => <span className="stamp">{i.grn_no}</span> },
    { key: 'item_name', label: 'Raw Material Item', render: i => <div><div className="font-medium text-text-primary">{i.item_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.item_code}</span></div></div> },
    { key: 'inspector_name', label: 'Inspector', render: i => i.inspector_name || '—' },
    { key: 'inspection_date', label: 'Date', render: i => <span className="tabular-nums">{formatDate(i.inspection_date)}</span> },
    { key: 'result', label: 'Inspection Result', render: i => {
      const status = i.qc_status === 'Passed' ? 'Pass' : i.qc_status === 'Failed' ? 'Fail' : 'Pending';
      return <StatusBadge status={status} />;
    }},
    { key: 'rejection_qty', label: 'Rejected Qty', render: i => <span className="tabular-nums">{parseFloat(i.rejection_qty)}</span> },
    { key: 'notes', label: 'Notes', render: i => i.notes || '—' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Inward Raw Material QC"
        subtitle="Perform quality checks on incoming store vendor shipments (GRNs) before stocking."
        actions={
          hasPermission('qc', 'create') && <button onClick={openCreate} className="btn-primary">Log GRN QC</button>
        }
      />

      <Table columns={columns} data={records} loading={loading} emptyMessage="No raw material inspections logged." />

      {/* QC Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Raw Material QC Inspection">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Select GRN *</label>
            <select value={form.grn_id} onChange={e => handleGRNChange(e.target.value)} className="field">
              <option value="" disabled>Select GRN</option>
              {grns.map(g => <option key={g.id} value={g.id}>{g.grn_no} (date: {formatDate(g.received_date)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Item to inspect *</label>
            <select value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))} className="field">
              <option value="">— Select Item —</option>
              {grnItems.map(i => <option key={i.item_id} value={i.item_id}>{i.item_name} (received: {parseFloat(i.received_qty)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Result *</label>
              <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="field">
                <option value="Pass">Pass (Add to stock)</option>
                <option value="Fail">Fail (Isolate / Gate Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Rejection Qty (if failed)</label>
              <input type="number" min="0" step="any" value={form.rejection_qty} onChange={e => setForm(p => ({ ...p, rejection_qty: e.target.value }))} className="field tabular-nums" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes / Inspection Comments</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field" rows={2} placeholder="Physical damage, gauge thickness test results..." />
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

export default RawMaterialQCPage;