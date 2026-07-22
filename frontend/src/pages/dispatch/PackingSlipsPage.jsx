import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { getPackingSlips, createPackingSlip } from '../../api/dispatchApi';
import { getOrders } from '../../api/salesApi';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

export default function PackingSlipsPage() {
  const [packingSlips, setPackingSlips] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [packQuantities, setPackQuantities] = useState({}); // item_id -> qty
  const [batchNumbers, setBatchNumbers] = useState({}); // item_id -> batch_no
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [psRes, ordersRes] = await Promise.all([
        getPackingSlips(),
        getOrders()
      ]);
      setPackingSlips(psRes.packingSlips || []);
      // Only keep orders that are Approved or In Progress
      setOrders((ordersRes.orders || []).filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled'));
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (orderId) => {
    setSelectedOrderId(orderId);
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order && order.line_items) {
        let parsed = order.line_items;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        setSelectedOrderItems(parsed);
      } else {
        setSelectedOrderItems([]);
      }
    } else {
      setSelectedOrderItems([]);
    }
    setPackQuantities({});
    setBatchNumbers({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedOrderId) {
      setError('Please select a sales order.');
      return;
    }

    const itemsToPack = selectedOrderItems.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      item_code: item.item_code,
      packed_qty: parseFloat(packQuantities[item.item_id] || 0),
      batch_no: batchNumbers[item.item_id] || ''
    })).filter(i => i.packed_qty > 0);

    if (itemsToPack.length === 0) {
      setError('Please specify packed quantity for at least one item.');
      return;
    }

    try {
      await createPackingSlip({
        sales_order_id: selectedOrderId,
        notes,
        packed_items: itemsToPack
      });
      setSuccess('Packing slip created successfully!');
      setShowModal(false);
      setSelectedOrderId('');
      setSelectedOrderItems([]);
      setNotes('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create packing slip.');
    }
  };

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <PageHeader
        title="Packing Slips"
        description="Manage shipments and partial packing dispatch tasks."
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Create Packing Slip
          </button>
        }
      />

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading packing slips...</div>
        ) : packingSlips.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="No packing slips found"
              description="You haven't created any packing slips yet. Start by packing an approved sales order."
              actionLabel="Create Packing Slip"
              onAction={() => setShowModal(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold text-xs">
                  <th className="p-4">PS No</th>
                  <th className="p-4">Sales Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Packed By</th>
                  <th className="p-4">Packed Date</th>
                  <th className="p-4 text-center">Items Count</th>
                  <th className="p-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {packingSlips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-300 transition-colors">
                    <td className="p-4 font-mono text-blue-600 dark:text-blue-400 font-medium">{ps.packing_slip_no || 'Pending'}</td>
                    <td className="p-4">{ps.sales_order_no || 'N/A'}</td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{ps.customer_name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{ps.packed_by_name || 'System'}</td>
                    <td className="p-4">{new Date(ps.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-center font-mono">{ps.items_count}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 italic">{ps.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Packing Slip"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Sales Order</label>
            <select
              value={selectedOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Choose Sales Order --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_no} ({o.customer_name})</option>
              ))}
            </select>
          </div>

          {selectedOrderItems.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Order Line Items</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {selectedOrderItems.map((item) => (
                  <div key={item.item_id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                    <div className="sm:col-span-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.item_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">Code: {item.item_code} | Ordered: {item.qty} {item.unit}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pack Qty</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={packQuantities[item.item_id] || ''}
                        onChange={(e) => setPackQuantities({ ...packQuantities, [item.item_id]: e.target.value })}
                        className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Batch Number</label>
                      <input
                        type="text"
                        placeholder="BATCH-001"
                        value={batchNumbers[item.item_id] || ''}
                        onChange={(e) => setBatchNumbers({ ...batchNumbers, [item.item_id]: e.target.value })}
                        className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Packing Notes / Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
              placeholder="E.g., Fragile, stack with care"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              Submit Packing Slip
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
