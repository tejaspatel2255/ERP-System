import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getStockLedger, getItems } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';
import { exportToCSV } from '../../utils/exportCSV';
import PageHeader from '../../components/PageHeader';

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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Stock Ledger"
        description="Full chronological transaction history with running balance for any item."
        actions={
          <button
            onClick={handleExport}
            className="btn btn-ghost px-3.5 py-2 text-xs font-mono uppercase tracking-wider"
          >
            Export CSV
          </button>
        }
      />

      {/* Controls Rail */}
      <div className="sheet p-3 flex flex-wrap gap-3 bg-bg-secondary items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Target Item</label>
          <select
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
            className="field text-xs font-sans"
          >
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="field text-xs font-mono w-auto"
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="field text-xs font-mono w-auto"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {selectedItemDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sheet p-4 space-y-1 relative overflow-hidden border-l-4 border-l-accent-primary">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Current Stock</span>
            <p className="font-display text-2xl font-bold tracking-tight text-accent-primary">
              {parseFloat(selectedItemDetails.current_stock)} <span className="text-xs font-mono font-normal text-text-muted">{selectedItemDetails.unit}</span>
            </p>
          </div>
          <div className="sheet p-4 space-y-1 relative overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Reorder Threshold</span>
            <p className="font-display text-2xl font-bold tracking-tight text-text-primary">
              {parseFloat(selectedItemDetails.reorder_level)} <span className="text-xs font-mono font-normal text-text-muted">{selectedItemDetails.unit}</span>
            </p>
          </div>
          <div className="sheet p-4 space-y-1 relative overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Ledger Entries</span>
            <p className="font-display text-2xl font-bold tracking-tight text-text-primary">
              {ledger.length}
            </p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" /></div>
      ) : ledger.length === 0 ? (
        <div className="sheet p-12 text-center text-text-muted font-mono text-xs">No transactions recorded for this item.</div>
      ) : (
        <div className="sheet overflow-hidden">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Done By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {ledger.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-bg-hover">
                  <td className="px-4 py-2.5 text-text-secondary">{formatDate(row.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono ${row.transaction_type === 'IN' ? 'text-accent-success border border-accent-success/30 bg-accent-success/10' : 'text-accent-danger border border-accent-danger/30 bg-accent-danger/10'}`}>
                      {row.transaction_type === 'IN' ? '▲ IN' : '▼ OUT'}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${row.transaction_type === 'IN' ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {row.transaction_type === 'IN' ? '+' : '-'}{parseFloat(row.qty)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-text-primary">{parseFloat(row.running_balance)}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.reference_type || '—'}</td>
                  <td className="px-4 py-2.5 text-text-muted max-w-[200px] truncate">{row.notes || '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.done_by || 'System'}</td>
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
