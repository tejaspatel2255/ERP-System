import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getStockAlerts } from '../../api/storeApi';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
    if (ratio <= 0) return { label: 'Critical', lamp: 'lamp-danger', borderCls: 'border-l-4 border-l-accent-danger', textCls: 'text-accent-danger', barCls: 'bg-accent-danger' };
    if (ratio <= 50) return { label: 'Low', lamp: 'lamp-warning', borderCls: 'border-l-4 border-l-amber-500', textCls: 'text-amber-500', barCls: 'bg-amber-500' };
    return { label: 'At Reorder', lamp: 'lamp-accent', borderCls: 'border-l-4 border-l-accent-primary', textCls: 'text-accent-primary', barCls: 'bg-accent-primary' };
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Stock Reorder Alerts"
        description={`Items at or below reorder level — ${alerts.length} alert${alerts.length !== 1 ? 's' : ''} active. Sorted by most critical first.`}
        actions={
          <button
            onClick={fetchAlerts}
            className="btn btn-ghost px-3.5 py-2 text-xs font-mono uppercase tracking-wider"
          >
            ↻ Refresh
          </button>
        }
      />

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-primary" /></div>
      ) : alerts.length === 0 ? (
        <div className="sheet p-16 flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center text-accent-success font-display text-xl font-bold">
            ✓
          </div>
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">All items are well-stocked</h3>
          <p className="text-xs font-mono text-text-muted">No inventory SKUs are currently at or below their reorder thresholds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {alerts.map(alert => {
            const ratio = parseFloat(alert.stock_ratio_pct);
            const { label, lamp, borderCls, textCls, barCls } = getAlertLevel(ratio);
            const shortage = parseFloat(alert.shortage);
            const currentStock = parseFloat(alert.current_stock);
            const reorderLevel = parseFloat(alert.reorder_level);

            return (
              <div key={alert.id} className={`sheet p-5 space-y-4 relative overflow-hidden ${borderCls}`}>
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`lamp ${lamp}`} />
                      <h3 className="font-bold text-text-primary truncate leading-tight">{alert.name}</h3>
                    </div>
                    <p className="text-xs font-mono text-text-muted mt-1">{alert.item_code} · {alert.category_name || 'Uncategorized'}</p>
                  </div>
                  <StatusBadge status={label} />
                </div>

                {/* Stock Progress Gauge */}
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted uppercase text-[10px] tracking-wider">Fill Ratio</span>
                    <span className={textCls}>{ratio.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-none bg-bg-secondary overflow-hidden border border-border-color">
                    <div
                      className={`h-full transition-all ${barCls}`}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Plate */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="sheet bg-bg-secondary p-2">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Current</p>
                    <p className="text-base font-bold text-text-primary mt-0.5">{currentStock}</p>
                    <p className="text-[10px] text-text-muted">{alert.unit}</p>
                  </div>
                  <div className="sheet bg-bg-secondary p-2">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Reorder At</p>
                    <p className="text-base font-bold text-text-primary mt-0.5">{reorderLevel}</p>
                    <p className="text-[10px] text-text-muted">{alert.unit}</p>
                  </div>
                  <div className="sheet bg-accent-danger/10 border-accent-danger/30 p-2">
                    <p className="text-[10px] text-accent-danger uppercase tracking-wider font-bold">Shortage</p>
                    <p className="text-base font-bold text-accent-danger mt-0.5">{shortage.toFixed(2)}</p>
                    <p className="text-[10px] text-accent-danger">{alert.unit}</p>
                  </div>
                </div>

                {/* Quick Action */}
                <button
                  onClick={() => navigate('/purchase/orders', { state: { prefillItem: alert } })}
                  className="btn btn-primary w-full py-2 text-xs font-mono uppercase tracking-wider"
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
