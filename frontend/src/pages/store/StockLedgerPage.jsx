import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getStockLedger, getItems } from '../../api/storeApi';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { exportToCSV } from '../../utils/exportCSV';

const StockLedgerPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    getItems({ limit: 500 }).then(d => {
      if (d.success) { setItems(d.items); if (d.items.length > 0) setSelectedItem(d.items[0].id); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    setLoading(true);
    getStockLedger(selectedItem, { startDate, endDate })
      .then(d => { if (d.success) setLedger(d.ledger); })
      .catch(() => toast.error('Failed to load ledger.'))
      .finally(() => setLoading(false));
  }, [selectedItem, startDate, endDate]);

  // CSV Export
  const handleExport = () => {
    if (ledger.length === 0) return toast.error('No data to export.');
    const item = items.find(i => i.id === selectedItem);
    exportToCSV(ledger.map((r) => ({
      Date: formatDate(r.date),
      Type: r.transaction_type,
      Qty: parseFloat(r.qty),
      'Running Balance': parseFloat(r.running_balance),
      Reference: r.reference_type || '',
      'Done By': r.done_by || ''
    })), `stock-ledger-${item?.item_code || 'export'}.csv`);
  };

  const selectedItemDetails = items.find(i => i.id === selectedItem);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Stock Ledger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Full chronological transaction history with running balance for any item.</p>
        </div>
        <button onClick={handleExport} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          ↓ Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Item</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
        </div>
      </div>

      {/* Summary card */}
      {selectedItemDetails && (
        <div className="flex gap-4 mb-6 flex-wrap">
          {[
            { label: 'Current Stock', value: `${parseFloat(selectedItemDetails.current_stock)} ${selectedItemDetails.unit}`, highlight: true },
            { label: 'Reorder Level', value: `${parseFloat(selectedItemDetails.reorder_level)} ${selectedItemDetails.unit}` },
            { label: 'Transactions', value: ledger.length }
          ].map(card => (
            <div key={card.label} className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ledger Table */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : ledger.length === 0 ? (
        <div className="py-16 text-center text-slate-400">No transactions found for this item.</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Running Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Done By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ledger.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${row.transaction_type === 'IN' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                      {row.transaction_type === 'IN' ? '▲ IN' : '▼ OUT'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${row.transaction_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                    {row.transaction_type === 'IN' ? '+' : '-'}{parseFloat(row.qty)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{parseFloat(row.running_balance)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.reference_type || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{row.notes || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.done_by || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedgerPage;
