import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getRawMaterialQC, createRawMaterialQC, approveRawMaterialQC } from '../../api/qcApi';
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
    } catch {
      toast.error('QC log failed.');
    }
  };

  const handleApprove = async (id, result) => {
    try {
      const res = await approveRawMaterialQC(id, { result });
      if (res.success) {
        toast.success(`QC updated to ${result}!`);
        fetchRecords();
      }
    } catch {
      toast.error('Failed to update QC status.');
    }
  };

  const columns = [
    { key: 'grn_no', label: 'GRN Ref', render: i => <span className="font-mono font-bold text-accent-primary">{i.grn_no}</span> },
    { key: 'item_name', label: 'Raw Material Item', render: i => (
      <div>
        <div className="font-medium text-text-primary">{i.item_name}</div>
        <div className="text-[10px] font-mono text-text-muted">{i.item_code}</div>
      </div>
    )},
    { key: 'inspector_name', label: 'Inspector', render: i => <span className="text-xs text-text-muted">{i.inspector_name || '—'}</span> },
    { key: 'inspection_date', label: 'Date', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.inspection_date)}</span> },
    { key: 'result', label: 'QC Gate Result', render: i => <StatusBadge status={i.result || 'Pending'} /> },
    { key: 'actions', label: 'Actions', render: i => {
      if (i.result === 'Pending' || !i.result) {
        return (
          <div className="flex gap-1.5">
            <button onClick={() => handleApprove(i.id, 'Pass')} className="btn btn-primary text-xs py-1 px-2">
              Pass & Stock IN
            </button>
            <button onClick={() => handleApprove(i.id, 'Fail')} className="btn btn-danger text-xs py-1 px-2">
              Fail (NCR)
            </button>
          </div>
        );
      }
      return <span className="text-[10px] font-mono text-text-muted uppercase">Gating Complete</span>;
    }}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Inward Raw Material QC Gate"
        description="Enforce physical quality inspections on inward supplier deliveries prior to releasing stock into store inventory."
        actions={
          hasPermission('qc', 'create') && (
            <button onClick={openCreate} className="btn btn-primary text-xs uppercase tracking-wider font-mono">
              + Log GRN QC Gate
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={records} loading={loading} emptyMessage="No raw material quality inspections logged." />
      </div>

      {/* QC Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Inward QC Gate Inspection">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Select GRN Deliveries *</label>
            <select value={form.grn_id} onChange={e => handleGRNChange(e.target.value)} className="field w-full">
              <option value="" disabled>Select GRN</option>
              {grns.map(g => <option key={g.id} value={g.id}>{g.grn_no} (date: {formatDate(g.received_date)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Item to inspect *</label>
            <select value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))} className="field w-full">
              <option value="">— Select Item —</option>
              {grnItems.map(i => <option key={i.item_id} value={i.item_id}>{i.item_name} (received: {parseFloat(i.received_qty)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Gate Decision *</label>
              <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="field w-full">
                <option value="Approved">Approved (Release to Stock IN)</option>
                <option value="Rejected">Rejected (Isolate & Raise NCR)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Rejection Qty</label>
              <input type="number" min="0" step="any" value={form.rejection_qty} onChange={e => setForm(p => ({ ...p, rejection_qty: e.target.value }))} className="field w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Inspection Telemetry Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field w-full" rows={2} placeholder="Tolerance measurements, gauge readings, surface defects..." />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn btn-primary text-xs">Submit QC Telemetry Log</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RawMaterialQCPage;
