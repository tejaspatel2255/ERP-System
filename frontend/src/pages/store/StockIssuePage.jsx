import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { issueStock, getIssues, getItems } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';

const StockIssuePage = () => {
  const { hasPermission } = useRole();
  const [issues, setIssues] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refType, setRefType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state
  const [form, setForm] = useState({
    reference_type: 'WorkOrder',
    reference_id: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [issueItems, setIssueItems] = useState([{ item_id: '', qty: '' }]);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIssues({ refType, startDate, endDate });
      if (data.success) setIssues(data.issues);
    } catch { toast.error('Failed to load issues.'); }
    finally { setLoading(false); }
  }, [refType, startDate, endDate]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  useEffect(() => {
    getItems({ limit: 500 }).then(d => { if (d.success) setAllItems(d.items); }).catch(() => {});
  }, []);

  const openForm = () => {
    setForm({ reference_type: 'WorkOrder', reference_id: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setIssueItems([{ item_id: '', qty: '' }]);
    setIsFormOpen(true);
  };

  const addRow = () => setIssueItems(p => [...p, { item_id: '', qty: '' }]);
  const removeRow = (i) => { if (issueItems.length === 1) return; setIssueItems(p => p.filter((_, idx) => idx !== i)); };

  const getItemDetails = (itemId) => allItems.find(i => i.id === itemId);

  const rowHasStockWarning = (row) => {
    if (!row.item_id || !row.qty) return false;
    const it = getItemDetails(row.item_id);
    return it && parseFloat(row.qty) > parseFloat(it.current_stock);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const anyWarn = issueItems.some(r => rowHasStockWarning(r));
    if (anyWarn) return toast.error('Quantity exceeds available stock for one or more items.');
    const invalid = issueItems.some(r => !r.item_id || !r.qty || parseFloat(r.qty) <= 0);
    if (invalid) return toast.error('All items must have a valid item and quantity > 0.');
    try {
      const res = await issueStock({ ...form, items: issueItems.map(r => ({ item_id: r.item_id, qty: parseFloat(r.qty) })) });
      if (res.success) { toast.success(`Stock issued (${res.issueNo}).`); setIsFormOpen(false); fetchIssues(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Issue failed.'); }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: i => <span className="font-mono text-xs text-text-secondary">{formatDate(i.date)}</span>
    },
    {
      key: 'reference_type',
      label: 'Issued To',
      render: i => <StatusBadge status={i.reference_type} />
    },
    {
      key: 'item_name',
      label: 'Item',
      render: i => (
        <div>
          <div className="font-medium text-text-primary">{i.item_name}</div>
          <div className="font-mono text-[10px] text-text-muted">{i.item_code}</div>
        </div>
      )
    },
    {
      key: 'qty',
      label: 'Qty Issued',
      render: i => (
        <span className="font-mono text-xs font-bold text-accent-danger">
          -{parseFloat(i.qty)} {i.unit}
        </span>
      )
    },
    {
      key: 'issued_by',
      label: 'Issued By',
      render: i => <span className="font-mono text-xs text-text-secondary">{i.issued_by || 'N/A'}</span>
    },
    {
      key: 'notes',
      label: 'Notes / Ref',
      render: i => <span className="font-mono text-xs text-text-muted">{i.notes || '—'}</span>
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Stock Issues"
        description="Issue materials to production work orders or sales fulfilment."
        actions={
          hasPermission('store', 'create') && (
            <button
              onClick={openForm}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-danger hover:brightness-110"
            >
              - Issue Stock
            </button>
          )
        }
      />

      {/* Filters Toolbar */}
      <div className="sheet p-3 flex flex-wrap gap-3 bg-bg-secondary">
        <select
          value={refType}
          onChange={e => setRefType(e.target.value)}
          className="field text-xs font-sans w-auto min-w-[160px]"
        >
          <option value="">All Types</option>
          <option value="WorkOrder">Work Order</option>
          <option value="SalesOrder">Sales Order</option>
          <option value="Manual">Manual</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="field text-xs font-mono w-auto"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="field text-xs font-mono w-auto"
        />
      </div>

      {/* Issues Table */}
      <div className="sheet">
        <Table columns={columns} data={issues} loading={loading} emptyMessage="No stock issues recorded." />
      </div>

      {/* Issue Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Issue Stock from Warehouse" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Issue To *</label>
              <select
                value={form.reference_type}
                onChange={e => setForm(p => ({ ...p, reference_type: e.target.value }))}
                className="field font-sans"
              >
                <option value="WorkOrder">Production / Work Order</option>
                <option value="SalesOrder">Sales / Dispatch</option>
                <option value="Manual">Manual / Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Issue Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="field font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Notes / Reference No</label>
              <input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. WO-202406-0012 or dispatch note..."
                className="field font-sans"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary">Items to Issue</h4>
              <button
                type="button"
                onClick={addRow}
                className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
              >
                + Add Item
              </button>
            </div>

            <div className="sheet overflow-hidden">
              <table className="w-full text-xs font-mono border-collapse">
                <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Item (Current Stock)</th>
                    <th className="px-3 py-2.5 text-center w-32">Qty to Issue</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {issueItems.map((row, idx) => {
                    const itemDetail = getItemDetails(row.item_id);
                    const warn = rowHasStockWarning(row);
                    return (
                      <tr key={idx} className={warn ? 'bg-accent-danger/10' : 'hover:bg-bg-hover'}>
                        <td className="p-2">
                          <select
                            required
                            value={row.item_id}
                            onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, item_id: e.target.value } : r))}
                            className="field py-1 px-2 text-xs font-sans"
                          >
                            <option value="" disabled>Select Item</option>
                            {allItems.map(it => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.item_code}) · Stock: {parseFloat(it.current_stock)} {it.unit}
                              </option>
                            ))}
                          </select>
                          {warn && (
                            <p className="text-[10px] text-accent-danger mt-1 font-mono">
                              ⚠ Exceeds available stock ({parseFloat(itemDetail?.current_stock)} {itemDetail?.unit})
                            </p>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0.0001"
                            step="any"
                            required
                            value={row.qty}
                            onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                            className={`field py-1 px-2 text-xs text-center font-mono ${warn ? 'border-accent-danger text-accent-danger' : ''}`}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="btn btn-ghost px-1.5 py-1 text-xs text-accent-danger hover:bg-accent-danger/10"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-danger hover:brightness-110"
            >
              Confirm Issue
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockIssuePage;
