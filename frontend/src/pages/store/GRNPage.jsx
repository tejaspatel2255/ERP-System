import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
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
        items.forEach(it => { initReceived[it.item_id] = ''; initRejected[it.item_id] = '0'; });
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
    if (!selectedPO) return toast.error('Please select a Purchase Order.');
    const items = poItems.map(it => ({
      item_id: it.item_id,
      ordered_qty: parseFloat(it.qty),
      received_qty: parseFloat(receivedQtys[it.item_id]) || 0,
      rejected_qty: parseFloat(rejectedQtys[it.item_id]) || 0
    }));
    const anyReceived = items.some(i => i.received_qty > 0);
    if (!anyReceived) return toast.error('At least one item must have received quantity > 0.');
    try {
      const res = await createGRN({ po_id: selectedPO.id, received_date: receivedDate, notes, items });
      if (res.success) { toast.success(`GRN ${res.grn.grn_no} created. Stock updated.`); setIsFormOpen(false); fetchGRNs(); }
    } catch (err) { toast.error(err.response?.data?.message || 'GRN creation failed.'); }
  };

  const handleView = async (grn) => {
    try {
      const res = await getGRNById(grn.id);
      if (res.success) { setViewingGrn(res.grn); setViewingItems(res.items); setIsViewOpen(true); }
    } catch { toast.error('Failed to load GRN.'); }
  };

  const columns = [
    { key: 'grn_no', label: 'GRN No' },
    { key: 'po_no', label: 'PO Reference' },
    { key: 'vendor_name', label: 'Supplier' },
    { key: 'received_date', label: 'Received Date', render: i => formatDate(i.received_date) },
    { key: 'item_count', label: 'Items', render: i => `${i.item_count} item(s)` },
    { key: 'received_by_name', label: 'Received By', render: i => i.received_by_name || 'N/A' },
    { key: 'actions', label: 'Actions', render: i => <button onClick={() => handleView(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2 py-1 rounded-md hover:bg-slate-100">View GRN</button> }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Goods Receipt Notes (GRN)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record supplier deliveries against approved POs and update warehouse stock.</p>
        </div>
        {hasPermission('store', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ Create GRN</button>}
      </div>

      <Table columns={columns} data={grns} loading={loading} emptyMessage="No GRNs recorded." />

      {/* Create GRN Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Goods Receipt Note" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Purchase Order *</label>
              <select required onChange={e => handlePOSelect(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="">— Select Approved PO —</option>
                {approvedPOs.map(po => <option key={po.id} value={po.id}>{po.po_no} · {po.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Received Date</label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Quality remarks, carrier details..." className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase">Item</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase text-center">Ordered</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase text-center">Received *</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase text-center">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {poItems.map(it => (
                    <tr key={it.item_id}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{it.item_name}</div>
                        <div className="text-[10px] text-slate-400">{it.item_code} · {it.unit || '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{parseFloat(it.qty)}</td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="any" placeholder="0" value={receivedQtys[it.item_id] ?? ''} onChange={e => setReceivedQtys(p => ({ ...p, [it.item_id]: e.target.value }))} className="block w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1 px-2 text-sm text-center focus:outline-none focus:border-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="any" placeholder="0" value={rejectedQtys[it.item_id] ?? '0'} onChange={e => setRejectedQtys(p => ({ ...p, [it.item_id]: e.target.value }))} className="block w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1 px-2 text-sm text-center focus:outline-none focus:border-red-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">Confirm Receipt & Update Stock</button>
          </div>
        </form>
      </Modal>

      {/* View GRN Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`GRN Detail: ${viewingGrn?.grn_no}`} size="lg">
        {viewingGrn && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div><p className="text-slate-400 font-semibold uppercase">Supplier</p><p className="font-bold text-slate-900 dark:text-white mt-1">{viewingGrn.vendor_name}</p></div>
              <div><p className="text-slate-400 font-semibold uppercase">PO Reference</p><p className="font-bold text-slate-900 dark:text-white mt-1">{viewingGrn.po_no}</p></div>
              <div><p className="text-slate-400 font-semibold uppercase">Received Date</p><p className="font-bold text-slate-900 dark:text-white mt-1">{formatDate(viewingGrn.received_date)}</p></div>
            </div>
            <Table
              columns={[
                { key: 'item_name', label: 'Item', render: i => <div><div className="font-semibold">{i.item_name}</div><div className="text-[10px] text-slate-400">{i.item_code}</div></div> },
                { key: 'ordered_qty', label: 'Ordered', render: i => parseFloat(i.ordered_qty) },
                { key: 'received_qty', label: 'Received', render: i => <span className="text-green-600 font-bold">{parseFloat(i.received_qty)}</span> },
                { key: 'rejected_qty', label: 'Rejected', render: i => <span className="text-red-600 font-bold">{parseFloat(i.rejected_qty)}</span> }
              ]}
              data={viewingItems}
              emptyMessage=""
            />
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsViewOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GRNPage;
