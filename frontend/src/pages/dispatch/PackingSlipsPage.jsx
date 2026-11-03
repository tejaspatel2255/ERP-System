import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { getPackingSlips, createPackingSlip } from '../../api/dispatchApi';
import { getOrders } from '../../api/salesApi';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import { formatDate } from '../../utils/formatDate';

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
        order_id: selectedOrderId,
        notes,
        items: itemsToPack.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          qty: item.packed_qty,
          batch_no: item.batch_no
        }))
      });
      setSuccess('Packing slip created successfully!');
      setShowModal(false);
      setSelectedOrderId('');
      setSelectedOrderItems([]);
      setNotes('');
      fetchData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create packing slip.';
      setError(message.toLowerCase().includes('insufficient stock')
        ? `Insufficient stock: ${message.replace(/^Insufficient stock for /i, '')}`
        : message);
    }
  };

  const columns = [
    {
      key: 'packing_slip_no',
      label: 'PS No',
      render: (item) => <span className="stamp">{item.packing_slip_no || 'Pending'}</span>
    },
    {
      key: 'sales_order_no',
      label: 'Sales Order',
      render: (item) => <span className="stamp">{item.sales_order_no || 'N/A'}</span>
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (item) => <span className="font-medium text-text-primary">{item.customer_name}</span>
    },
    {
      key: 'packed_by_name',
      label: 'Packed By',
      render: (item) => <span className="text-text-muted">{item.packed_by_name || 'System'}</span>
    },
    {
      key: 'created_at',
      label: 'Packed Date',
      render: (item) => <span className="tabular-nums text-text-secondary">{formatDate(item.created_at)}</span>
    },
    {
      key: 'items_count',
      label: 'Items Count',
      render: (item) => <span className="tabular-nums font-semibold text-text-primary text-center block">{item.items_count}</span>
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (item) => <span className="text-text-muted italic">{item.notes || '—'}</span>
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Packing Slips"
        description="Manage shipments and partial packing dispatch tasks."
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Create Packing Slip
          </button>
        }
      />

      {error && (
        <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
          {error.toLowerCase().startsWith('insufficient stock:') && <p className="font-semibold mb-1">Packing slip rejected</p>}
          <p>{error}</p>
        </div>
      )}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Select Sales Order *</label>
            <select
              value={selectedOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="field"
              required
            >
              <option value="">-- Choose Sales Order --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_no} ({o.customer_name})</option>
              ))}
            </select>
          </div>

          {selectedOrderItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-color pb-1.5">Order Line Items</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {selectedOrderItems.map((item) => (
                  <div key={item.item_id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center sheet p-3">
                    <div className="sm:col-span-2">
                      <p className="font-semibold text-sm text-text-primary">{item.item_name}</p>
                      <p className="text-xs text-text-muted mt-0.5"><span className="stamp">{item.item_code}</span> | Ordered: {item.qty} {item.unit}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Pack Qty</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={packQuantities[item.item_id] || ''}
                        onChange={(e) => setPackQuantities({ ...packQuantities, [item.item_id]: e.target.value })}
                        className="field tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Batch Number</label>
                      <input
                        type="text"
                        placeholder="BATCH-001"
                        value={batchNumbers[item.item_id] || ''}
                        onChange={(e) => setBatchNumbers({ ...batchNumbers, [item.item_id]: e.target.value })}
                        className="field"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Packing Notes / Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field min-h-[90px]"
              placeholder="E.g., Fragile, stack with care"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Submit Packing Slip
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}