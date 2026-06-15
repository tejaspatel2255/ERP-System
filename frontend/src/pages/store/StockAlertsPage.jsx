import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getStockAlerts } from '../../api/storeApi';
import Modal from '../../components/Modal';
import { useNavigate } from 'react-router-dom';

const StockAlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getStockAlerts();
      if (data.success) setAlerts(data.alerts);
    } catch { toast.error('Failed to load stock alerts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const getAlertLevel = (ratio) => {
    if (ratio <= 0) return { label: 'Critical', cls: 'border-red-400 bg-red-50 dark:bg-red-950/30', badgeCls: 'bg-red-100 text-red-800 border-red-200', barCls: 'bg-red-500' };
    if (ratio <= 50) return { label: 'Low', cls: 'border-orange-400 bg-orange-50 dark:bg-orange-950/20', badgeCls: 'bg-orange-100 text-orange-800 border-orange-200', barCls: 'bg-orange-500' };
    return { label: 'At Reorder', cls: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20', badgeCls: 'bg-yellow-100 text-yellow-800 border-yellow-200', barCls: 'bg-yellow-500' };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Stock Reorder Alerts</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Items at or below reorder level — {alerts.length} alert{alerts.length !== 1 ? 's' : ''} active. Sorted by most critical first.
          </p>
        </div>
        <button onClick={fetchAlerts} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : alerts.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">All items are well-stocked</h3>
          <p className="text-sm text-slate-500 mt-2">No items are currently at or below their reorder levels.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {alerts.map(alert => {
            const ratio = parseFloat(alert.stock_ratio_pct);
            const { label, cls, badgeCls, barCls } = getAlertLevel(ratio);
            const shortage = parseFloat(alert.shortage);
            const currentStock = parseFloat(alert.current_stock);
            const reorderLevel = parseFloat(alert.reorder_level);

            return (
              <div key={alert.id} className={`rounded-2xl border-2 p-5 shadow-sm space-y-4 ${cls}`}>
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{alert.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{alert.item_code} · {alert.category_name || 'Uncategorized'}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${badgeCls} shrink-0`}>
                    {label}
                  </span>
                </div>

                {/* Stock Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Stock Level</span>
                    <span className="text-slate-900 dark:text-white">{ratio.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barCls}`}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 p-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Current</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{currentStock}</p>
                    <p className="text-[10px] text-slate-400">{alert.unit}</p>
                  </div>
                  <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 p-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Reorder At</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{reorderLevel}</p>
                    <p className="text-[10px] text-slate-400">{alert.unit}</p>
                  </div>
                  <div className="rounded-xl bg-red-100/80 dark:bg-red-950/30 p-2">
                    <p className="text-[10px] text-red-500 uppercase font-semibold">Shortage</p>
                    <p className="text-base font-bold text-red-600 dark:text-red-400">{shortage.toFixed(2)}</p>
                    <p className="text-[10px] text-red-400">{alert.unit}</p>
                  </div>
                </div>

                {/* Quick Action */}
                <button
                  onClick={() => navigate('/purchase/orders', { state: { prefillItem: alert } })}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 transition-colors"
                >
                  + Raise Purchase Order
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockAlertsPage;
