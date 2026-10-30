import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { useRole } from '../../context/RoleContext';
import { getGRNs, createGRN, getGRNById } from '../../api/storeApi';
import { getPurchaseOrders } from '../../api/purchaseApi';
import { formatDate } from '../../utils/formatDate';

const GRNPage = () => {
  const { hasPermission } = useRole();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingGrn, setViewingGrn] = useState(null);
  const [viewingItems, setViewingItems] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [receivedQtys, setReceivedQtys] = useState({});
  const [rejectedQtys, setRejectedQtys] = useState({});
  const [notes, setNotes] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGRNs();
      if (data.success) setGrns(data.grns);
    } catch { toast.error('Failed to load GRNs.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGRNs(); }, [fetchGRNs]);

  useEffect(() => {
    getPurchaseOrders({ limit: 200 }).then(d => {
      if (d.success) {
        // Only show Approved POs not yet fully received
        const eligible = d.orders.filter(po => po.approval_status === 'Approved' && po.status !== 'Completed');
        setApprovedPOs(eligible);
      }
    }).catch(() => {});
  }, []);

  const handlePOSelect = async (poId) => {
    const po = approvedPOs.find(p => p.id === poId);
    setSelectedPO(po || null);
    if (!po) { setPoItems([]); return; }
    try {
      const { default: axiosInstance } = await import('../../api/axiosInstance');
      const res = await axiosInstance.get(`/purchase/orders/${poId}`);
      if (res.data.success) {
        const items = res.data.items;
        setPoItems(items);
        const initReceived = {};
        const initRejected = {};
        items.forEach(it => { initReceived[it.item_id] = String(it.qty || ''); initRejected[it.item_id] = '0'; });
        setReceivedQtys(initReceived);
        setRejectedQtys(initRejected);
      }
    } catch { toast.error('Failed to load PO items.'); }
  };

  const openCreate = () => {
    setSelectedPO(null); setPoItems([]); setReceivedQtys({}); setRejectedQtys({});
    setNotes(''); setReceivedDate(new Date().toISOString().slice(0, 10));
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedPO) return toast.error('Please select a Purchase Order.');
    const items = poItems.map(it => ({
      item_id: it.item_id,
      ordered_qty: parseFloat(it.qty),
      received_qty: parseFloat(receivedQtys[it.item_id]) || 0,
      rejected_qty: parseFloat(rejectedQtys[it.item_id]) || 0
    }));
    const anyReceived = items.some(i => i.received_qty > 0);
    if (!anyReceived) return toast.error('At least one item must have received quantity > 0.');
    
    setSubmitting(true);
    try {
      const res = await createGRN({ po_id: selectedPO.id, received_date: receivedDate, notes, items });
      if (res.success) { toast.success(`GRN ${res.grn.grn_no} created. Stock updated.`); setIsFormOpen(false); fetchGRNs(); }
    } catch (err) { 
      toast.error(err.response?.data?.message || 'GRN creation failed.'); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (grn) => {
    try {
      const res = await getGRNById(grn.id);
      if (res.success) { setViewingGrn(res.grn); setViewingItems(res.items); setIsViewOpen(true); }
    } catch { toast.error('Failed to load GRN.'); }
  };

  const columns = [
    {
      key: 'grn_no',
      label: 'GRN Ref',
      render: i => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {i.grn_no}
        </span>
      )
    },
    {
      key: 'po_no',
      label: 'PO Reference',
      render: i => (
        <span className="font-mono text-xs text-text-secondary">
          {i.po_no}
        </span>
      )
    },
    {
      key: 'vendor_name',
      label: 'Supplier',
      render: i => <span className="font-medium text-text-primary">{i.vendor_name}</span>
    },
    {
      key: 'received_date',
      label: 'Received Date',
      render: i => <span className="font-mono text-xs text-text-secondary">{formatDate(i.received_date)}</span>
    },
    {
      key: 'item_count',
      label: 'Deliveries',
      render: i => <span className="font-mono text-xs text-text-primary">{i.item_count} item(s)</span>
    },
    {
      key: 'received_by_name',
      label: 'Received By',
      render: i => <span className="font-mono text-xs text-text-muted">{i.received_by_name || 'N/A'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        <button
          onClick={() => handleView(i)}
          className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider"
        >
          View GRN
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Goods Receipt Notes (GRN)"
        description="Record inward supplier deliveries against approved PO contracts and route to Quality Control Gating."
        actions={
          hasPermission('store', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Create Inward GRN
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={grns} loading={loading} emptyMessage="No inward GRN deliveries recorded." />
      </div>

      {/* Create GRN Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Goods Receipt Note (GRN)" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Select Purchase Order *</label>
              <select
                required
                onChange={e => handlePOSelect(e.target.value)}
                className="field font-sans"
              >
                <option value="">— Select Approved PO Contract —</option>
                {approvedPOs.map(po => <option key={po.id} value={po.id}>{po.po_no} · {po.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Received Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Inward Notes</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Carrier details, delivery note..."
                className="field font-sans"
              />
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="sheet overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Item Description</th>
                    <th className="px-2 py-2.5 font-bold text-center w-24">Ordered</th>
                    <th className="px-2 py-2.5 font-bold text-center w-28">Received *</th>
                    <th className="px-2 py-2.5 font-bold text-center w-28">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {poItems.map(it => (
                    <tr key={it.item_id} className="hover:bg-bg-hover">
                      <td className="px-3 py-2">
                        <div className="font-bold text-text-primary font-sans">{it.item_name}</div>
                        <div className="text-[10px] text-text-muted font-mono">{it.item_code} · {it.unit || '—'}</div>
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-text-primary">{parseFloat(it.qty)}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={receivedQtys[it.item_id] ?? ''}
                          onChange={e => setReceivedQtys(p => ({ ...p, [it.item_id]: e.target.value }))}
                          className="field py-1 px-2 text-xs text-center font-mono"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={rejectedQtys[it.item_id] ?? '0'}
                          onChange={e => setRejectedQtys(p => ({ ...p, [it.item_id]: e.target.value }))}
                          className="field py-1 px-2 text-xs text-center font-mono text-accent-danger border-accent-danger/50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
              disabled={submitting}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Confirm Receipt & Route to QC Gate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View GRN Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`GRN Details: ${viewingGrn?.grn_no}`} size="lg">
        {viewingGrn && (
          <div className="space-y-6 font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sheet bg-bg-secondary text-xs">
              <div>
                <p className="text-text-muted font-mono text-[10px] uppercase tracking-wider">Supplier</p>
                <p className="font-bold text-text-primary mt-1 text-sm">{viewingGrn.vendor_name}</p>
              </div>
              <div>
                <p className="text-text-muted font-mono text-[10px] uppercase tracking-wider">PO Contract Ref</p>
                <p className="font-mono font-bold text-accent-primary mt-1 text-sm">{viewingGrn.po_no}</p>
              </div>
              <div>
                <p className="text-text-muted font-mono text-[10px] uppercase tracking-wider">Received Date</p>
                <p className="font-mono font-bold text-text-primary mt-1 text-sm">{formatDate(viewingGrn.received_date)}</p>
              </div>
            </div>
            <div className="sheet">
              <Table
                columns={[
                  {
                    key: 'item_name',
                    label: 'Item Description',
                    render: i => (
                      <div>
                        <div className="font-bold text-text-primary">{i.item_name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{i.item_code}</div>
                      </div>
                    )
                  },
                  {
                    key: 'ordered_qty',
                    label: 'Ordered',
                    isNumeric: true,
                    render: i => <span className="font-mono text-xs">{parseFloat(i.ordered_qty)}</span>
                  },
                  {
                    key: 'received_qty',
                    label: 'Received',
                    isNumeric: true,
                    render: i => <span className="text-accent-success font-mono text-xs font-bold">{parseFloat(i.received_qty)}</span>
                  },
                  {
                    key: 'rejected_qty',
                    label: 'Rejected',
                    isNumeric: true,
                    render: i => <span className="text-accent-danger font-mono text-xs font-bold">{parseFloat(i.rejected_qty)}</span>
                  }
                ]}
                data={viewingItems}
                emptyMessage=""
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                onClick={() => setIsViewOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GRNPage;
