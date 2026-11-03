import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
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
    { key: 'date', label: 'Date', render: i => formatDate(i.date) },
    { key: 'reference_type', label: 'Issued To' },
    { key: 'item_name', label: 'Item', render: i => <div><div className="font-medium text-text-primary">{i.item_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.item_code}</span></div></div> },
    { key: 'qty', label: 'Qty Issued', render: i => <span className="text-[var(--danger-text)] font-semibold tabular-nums">-{parseFloat(i.qty)} {i.unit}</span> },
    { key: 'issued_by', label: 'Issued By', render: i => i.issued_by || 'N/A' },
    { key: 'notes', label: 'Notes / Ref', render: i => i.notes || '—' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Stock Issues"
        subtitle="Issue materials to production work orders or sales fulfilment."
        actions={
          hasPermission('store', 'create') && <button onClick={openForm} className="btn-primary">Issue Stock</button>
        }
      />

      {/* Filters */}
      <div className="sheet p-3 flex flex-wrap gap-3 items-center">
        <select value={refType} onChange={e => setRefType(e.target.value)} className="field md:w-44">
          <option value="">All Types</option>
          <option value="WorkOrder">Work Order</option>
          <option value="SalesOrder">Sales Order</option>
          <option value="Manual">Manual</option>
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="field md:w-40" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="field md:w-40" />
      </div>

      <Table columns={columns} data={issues} loading={loading} emptyMessage="No stock issues recorded." />

      {/* Issue Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Issue Stock from Warehouse" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Issue To *</label>
              <select value={form.reference_type} onChange={e => setForm(p => ({ ...p, reference_type: e.target.value }))} className="field">
                <option value="WorkOrder">Production / Work Order</option>
                <option value="SalesOrder">Sales / Dispatch</option>
                <option value="Manual">Manual / Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Issue Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="field" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes / Reference No</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. WO-202406-0012 or dispatch note..." className="field" />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-text-primary">Items to Issue</h4>
              <button type="button" onClick={addRow} className="btn-secondary btn-xs">+ Add Item</button>
            </div>

            <div className="sheet overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-bg-subtle border-b border-border-color">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-text-secondary text-left">Item (Current Stock)</th>
                    <th className="px-3 py-2.5 font-semibold text-text-secondary text-center w-32">Qty to Issue</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {issueItems.map((row, idx) => {
                    const itemDetail = getItemDetails(row.item_id);
                    const warn = rowHasStockWarning(row);
                    return (
                      <tr key={idx} className={warn ? 'bg-[var(--danger-bg)]' : ''}>
                        <td className="px-2 py-2">
                          <select required value={row.item_id} onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, item_id: e.target.value } : r))} className="field py-1.5 px-2 text-sm">
                            <option value="" disabled>Select Item</option>
                            {allItems.map(it => <option key={it.id} value={it.id}>{it.name} ({it.item_code}) · Stock: {parseFloat(it.current_stock)} {it.unit}</option>)}
                          </select>
                          {warn && <p className="text-xs text-[var(--danger-text)] mt-1 font-medium">⚠ Exceeds available stock ({parseFloat(itemDetail?.current_stock)} {itemDetail?.unit})</p>}
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0.0001" step="any" required value={row.qty} onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} className={`field py-1.5 px-2 text-sm text-center tabular-nums ${warn ? 'border-[var(--danger-border)]' : ''}`} />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => removeRow(idx)} className="text-[var(--danger-text)] hover:opacity-80 p-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Confirm Issue</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockIssuePage;