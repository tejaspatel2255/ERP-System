import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { getPackingSlips, createPackingSlip } from '../../api/dispatchApi';
import { getOrders, getOrderById } from '../../api/salesApi';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Table from '../../components/Table';

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
  const [packQuantities, setPackQuantities] = useState({});
  const [batchNumbers, setBatchNumbers] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setOrders((ordersRes.orders || []).filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled'));
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = async (orderId) => {
    setSelectedOrderId(orderId);
    setPackQuantities({});
    setBatchNumbers({});
    if (orderId) {
      try {
        const res = await getOrderById(orderId);
        if (res.success && res.items) {
          setSelectedOrderItems(res.items);
          const initialQtys = {};
          res.items.forEach(item => {
            initialQtys[item.item_id] = item.qty || '5';
          });
          setPackQuantities(initialQtys);
        } else {
          setSelectedOrderItems([]);
        }
      } catch (e) {
        setSelectedOrderItems([]);
      }
    } else {
      setSelectedOrderItems([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
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
      qty: parseFloat(packQuantities[item.item_id] || 0),
      batch_no: batchNumbers[item.item_id] || ''
    })).filter(i => i.qty > 0);

    if (itemsToPack.length === 0) {
      setError('Please specify packed quantity for at least one item.');
      return;
    }

    setSubmitting(true);
    try {
      await createPackingSlip({
        order_id: selectedOrderId,
        notes,
        items: itemsToPack
      });
      setSuccess('Packing slip created successfully!');
      setShowModal(false);
      setSelectedOrderId('');
      setSelectedOrderItems([]);
      setNotes('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create packing slip.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'packing_slip_no',
      label: 'PS No',
      render: (item) => <span className="font-mono text-accent-primary font-medium">{item.packing_slip_no || 'Pending'}</span>
    },
    {
      key: 'sales_order_no',
      label: 'Sales Order',
      render: (item) => <span className="font-mono text-text-secondary">{item.sales_order_no || 'N/A'}</span>
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (item) => <span className="font-semibold text-text-primary">{item.customer_name}</span>
    },
    {
      key: 'packed_by_name',
      label: 'Packed By',
      render: (item) => <span className="text-text-muted">{item.packed_by_name || 'System'}</span>
    },
    {
      key: 'created_at',
      label: 'Packed Date',
      render: (item) => <span className="text-text-secondary">{new Date(item.created_at).toLocaleDateString()}</span>
    },
    {
      key: 'items_count',
      label: 'Items Count',
      render: (item) => <span className="font-mono font-semibold text-text-primary text-center block">{item.items_count}</span>
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (item) => <span className="text-text-muted italic">{item.notes || '—'}</span>
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Packing Slips"
        description="Manage shipments and partial packing dispatch tasks."
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            Create Packing Slip
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      {packingSlips.length === 0 && !loading ? (
        <EmptyState
          icon={Package}
          title="No packing slips found"
          description="You haven't created any packing slips yet. Start by packing an approved sales order."
          actionLabel="Create Packing Slip"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <Table columns={columns} data={packingSlips} loading={loading} emptyMessage="No packing slips found." />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Packing Slip"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">Select Sales Order *</label>
            <select
              value={selectedOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-color pb-2">Order Line Items</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {selectedOrderItems.map((item) => (
                  <div key={item.item_id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-bg-secondary/60 p-4 border border-border-color rounded-2xl">
                    <div className="sm:col-span-2">
                      <p className="font-semibold text-sm text-text-primary">{item.item_name}</p>
                      <p className="text-xs text-text-muted font-mono mt-1">Code: {item.item_code} | Ordered: {item.qty} {item.unit}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Pack Qty</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={packQuantities[item.item_id] || ''}
                        onChange={(e) => setPackQuantities({ ...packQuantities, [item.item_id]: e.target.value })}
                        className="block w-full rounded-xl border border-border-color bg-bg-card py-1.5 px-3 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Batch Number</label>
                      <input
                        type="text"
                        placeholder="BATCH-001"
                        value={batchNumbers[item.item_id] || ''}
                        onChange={(e) => setBatchNumbers({ ...batchNumbers, [item.item_id]: e.target.value })}
                        className="block w-full rounded-xl border border-border-color bg-bg-card py-1.5 px-3 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">Packing Notes / Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl border border-border-color bg-bg-secondary py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary min-h-[100px]"
              placeholder="E.g., Fragile, stack with care"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-border-color bg-bg-secondary py-2 px-4 text-sm font-semibold text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Packing Slip'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
