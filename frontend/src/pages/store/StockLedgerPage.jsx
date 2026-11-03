import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getStockLedger, getItems } from '../../api/storeApi';
import PageHeader from '../../components/PageHeader';
import { formatDate } from '../../utils/formatDate';
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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Stock Ledger"
        subtitle="Full chronological transaction history with running balance for any item."
        actions={
          <button onClick={handleExport} className="btn-secondary">
            ↓ Export CSV
          </button>
        }
      />

      {/* Controls */}
      <div className="sheet p-3 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Item</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="field">
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="field" />
        </div>
      </div>

      {/* Summary card */}
      {selectedItemDetails && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Current Stock', value: `${parseFloat(selectedItemDetails.current_stock)} ${selectedItemDetails.unit}`, highlight: true },
            { label: 'Reorder Level', value: `${parseFloat(selectedItemDetails.reorder_level)} ${selectedItemDetails.unit}` },
            { label: 'Transactions', value: ledger.length }
          ].map(card => (
            <div key={card.label} className="kpi-card min-w-[160px]">
              <p className="kpi-label">{card.label}</p>
              <p className={`kpi-value ${card.highlight ? 'text-[var(--accent-primary)]' : ''}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ledger Table */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" /></div>
      ) : ledger.length === 0 ? (
        <div className="sheet py-16 text-center text-text-muted">No transactions found for this item.</div>
      ) : (
        <div className="sheet overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-subtle border-b border-border-color">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Running Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Reference</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Done By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {ledger.map((row, idx) => {
                const isIn = row.transaction_type === 'IN';
                return (
                  <tr key={row.id || idx} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3 text-xs text-text-muted tabular-nums">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${isIn ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]' : 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]'}`}>
                        {isIn ? '▲ IN' : '▼ OUT'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${isIn ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                      {isIn ? '+' : '-'}{parseFloat(row.qty)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-text-primary">{parseFloat(row.running_balance)}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary"><span className="stamp">{row.reference_type || '—'}</span></td>
                    <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate">{row.notes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{row.done_by || 'System'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedgerPage;