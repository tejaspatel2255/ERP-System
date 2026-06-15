import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { issueStock, getIssues, getItems } from '../../api/storeApi';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const StockIssuePage = () => {
  const { hasPermission, user } = useRole();
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
    { key: 'item_name', label: 'Item', render: i => <div><div className="font-semibold">{i.item_name}</div><div className="text-[10px] text-slate-400">{i.item_code}</div></div> },
    { key: 'qty', label: 'Qty Issued', render: i => <span className="text-red-600 font-bold">-{parseFloat(i.qty)} {i.unit}</span> },
    { key: 'issued_by', label: 'Issued By', render: i => i.issued_by || 'N/A' },
    { key: 'notes', label: 'Notes / Ref', render: i => i.notes || '—' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Stock Issues</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Issue materials to production work orders or sales fulfilment.</p>
        </div>
        {hasPermission('store', 'create') && <button onClick={openForm} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500">Issue Stock</button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={refType} onChange={e => setRefType(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none">
          <option value="">All Types</option>
          <option value="WorkOrder">Work Order</option>
          <option value="SalesOrder">Sales Order</option>
          <option value="Manual">Manual</option>
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none" />
      </div>

      <Table columns={columns} data={issues} loading={loading} emptyMessage="No stock issues recorded." />

      {/* Issue Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Issue Stock from Warehouse" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue To *</label>
              <select value={form.reference_type} onChange={e => setForm(p => ({ ...p, reference_type: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="WorkOrder">Production / Work Order</option>
                <option value="SalesOrder">Sales / Dispatch</option>
                <option value="Manual">Manual / Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Reference No</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. WO-202406-0012 or dispatch note..." className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Items to Issue</h4>
              <button type="button" onClick={addRow} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">+ Add Item</button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-left">Item (Current Stock)</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase text-center w-28">Qty to Issue</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {issueItems.map((row, idx) => {
                    const itemDetail = getItemDetails(row.item_id);
                    const warn = rowHasStockWarning(row);
                    return (
                      <tr key={idx} className={warn ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <td className="px-2 py-2">
                          <select required value={row.item_id} onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, item_id: e.target.value } : r))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-slate-900 dark:text-white focus:outline-none">
                            <option value="" disabled>Select Item</option>
                            {allItems.map(it => <option key={it.id} value={it.id}>{it.name} ({it.item_code}) · Stock: {parseFloat(it.current_stock)} {it.unit}</option>)}
                          </select>
                          {warn && <p className="text-[10px] text-red-600 mt-0.5">⚠ Exceeds available stock ({parseFloat(itemDetail?.current_stock)} {itemDetail?.unit})</p>}
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0.0001" step="any" required value={row.qty} onChange={e => setIssueItems(p => p.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} className={`block w-full rounded border py-1.5 px-2 text-sm text-center focus:outline-none ${warn ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-950`} />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700 p-1">
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Confirm Issue</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockIssuePage;
