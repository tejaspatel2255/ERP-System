import React, { useState, useEffect } from 'react';
import { getPackingSlips, createPackingSlip } from '../../api/dispatchApi';
import { getOrders, getOrderById } from '../../api/salesApi';

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

  const handleOrderChange = async (orderId) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setSelectedOrderItems([]);
      return;
    }
    try {
      const res = await getOrderById(orderId);
      const items = res.items || [];
      setSelectedOrderItems(items);
      
      // Initialize packing quantities and batch numbers
      const initialQtys = {};
      const initialBatches = {};
      items.forEach(item => {
        initialQtys[item.item_id] = '';
        initialBatches[item.item_id] = '';
      });
      setPackQuantities(initialQtys);
      setBatchNumbers(initialBatches);
    } catch (err) {
      setError('Failed to load order items.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Prepare line items
    const itemsToPack = selectedOrderItems
      .map(item => ({
        item_id: item.item_id,
        qty: parseFloat(packQuantities[item.item_id] || 0),
        batch_no: batchNumbers[item.item_id] || ''
      }))
      .filter(item => item.qty > 0);

    if (itemsToPack.length === 0) {
      setError('Please specify a pack quantity greater than 0 for at least one item.');
      return;
    }

    try {
      await createPackingSlip({
        order_id: selectedOrderId,
        items: itemsToPack,
        notes
      });
      setSuccess('Packing Slip created successfully.');
      setShowModal(false);
      // Reset form
      setSelectedOrderId('');
      setSelectedOrderItems([]);
      setNotes('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create packing slip.');
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Packing Slips</h1>
          <p className="text-slate-400 text-sm mt-1">Manage shipments and partial packing dispatch tasks.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <span>+</span> Create Packing Slip
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200">{success}</div>}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading packing slips...</div>
        ) : packingSlips.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No packing slips found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-sm">
                  <th className="p-4">PS No</th>
                  <th className="p-4">Sales Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Packed By</th>
                  <th className="p-4">Packed Date</th>
                  <th className="p-4 text-center">Items Count</th>
                  <th className="p-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {packingSlips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    <td className="p-4 font-mono text-blue-400 font-medium">{ps.packing_slip_no || 'Pending'}</td>
                    <td className="p-4">{ps.sales_order_no || 'N/A'}</td>
                    <td className="p-4 font-semibold text-white">{ps.customer_name}</td>
                    <td className="p-4 text-slate-400">{ps.packed_by_name || 'System'}</td>
                    <td className="p-4">{new Date(ps.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-center font-mono">{ps.items_count}</td>
                    <td className="p-4 text-slate-400 text-sm italic">{ps.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Create New Packing Slip</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Select Sales Order</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 transition-all"
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
                  <h4 className="text-md font-bold text-slate-300 border-b border-slate-700 pb-2">Order Line Items</h4>
                  <div className="space-y-3">
                    {selectedOrderItems.map((item) => (
                      <div key={item.item_id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-900/40 p-4 border border-slate-700/50 rounded-lg">
                        <div className="md:col-span-2">
                          <p className="font-semibold text-white">{item.item_name}</p>
                          <p className="text-xs text-slate-400 font-mono">Code: {item.item_code} | Ordered: {item.qty} {item.unit}</p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Pack Qty</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.0"
                            value={packQuantities[item.item_id] || ''}
                            onChange={(e) => setPackQuantities({ ...packQuantities, [item.item_id]: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Batch Number</label>
                          <input
                            type="text"
                            placeholder="BATCH-001"
                            value={batchNumbers[item.item_id] || ''}
                            onChange={(e) => setBatchNumbers({ ...batchNumbers, [item.item_id]: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Packing Notes / Special Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 transition-all h-24"
                  placeholder="E.g., Fragile, stack with care"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
                >
                  Submit Packing Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
