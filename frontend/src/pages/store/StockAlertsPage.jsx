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

  const getAlertConfig = (ratio) => {
    if (ratio <= 0) return { label: 'Critical', rail: 'var(--danger-rail)', borderCls: 'border-l-[3px] border-l-[var(--danger-rail)]' };
    if (ratio <= 50) return { label: 'Low', rail: 'var(--warning-rail)', borderCls: 'border-l-[3px] border-l-[var(--warning-rail)]' };
    return { label: 'At Reorder', rail: 'var(--accent-primary)', borderCls: 'border-l-[3px] border-l-[var(--accent-primary)]' };
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Stock Reorder Alerts"
        subtitle={`Items at or below reorder level — ${alerts.length} alert${alerts.length !== 1 ? 's' : ''} active. Sorted by most critical first.`}
        actions={
          <button onClick={fetchAlerts} className="btn-secondary">
            ↻ Refresh
          </button>
        }
      />

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" /></div>
      ) : alerts.length === 0 ? (
        <div className="sheet py-20 flex flex-col items-center text-center">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-base font-semibold text-text-primary">All items are well-stocked</h3>
          <p className="text-sm text-text-muted mt-1">No items are currently at or below their reorder levels.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alerts.map(alert => {
            const ratio = parseFloat(alert.stock_ratio_pct);
            const { label, rail, borderCls } = getAlertConfig(ratio);
            const shortage = parseFloat(alert.shortage);
            const currentStock = parseFloat(alert.current_stock);
            const reorderLevel = parseFloat(alert.reorder_level);

            return (
              <div key={alert.id} className={`sheet p-4 space-y-4 ${borderCls}`}>
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary leading-tight truncate">{alert.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5"><span className="stamp">{alert.item_code}</span> · {alert.category_name || 'Uncategorized'}</p>
                  </div>
                  <StatusBadge status={label} />
                </div>

                {/* Stock Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">Stock Level</span>
                    <span className="text-text-primary tabular-nums">{ratio.toFixed(0)}%</span>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(ratio, 100)}%`,
                        background: rail
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-bg-subtle p-2">
                    <p className="text-xs text-text-muted font-medium">Current</p>
                    <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">{currentStock}</p>
                    <p className="text-[10px] text-text-muted">{alert.unit}</p>
                  </div>
                  <div className="rounded-lg bg-bg-subtle p-2">
                    <p className="text-xs text-text-muted font-medium">Reorder At</p>
                    <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">{reorderLevel}</p>
                    <p className="text-[10px] text-text-muted">{alert.unit}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--danger-bg)] p-2">
                    <p className="text-xs text-[var(--danger-text)] font-medium">Shortage</p>
                    <p className="text-sm font-semibold text-[var(--danger-text)] tabular-nums mt-0.5">{shortage.toFixed(2)}</p>
                    <p className="text-[10px] text-[var(--danger-text)]">{alert.unit}</p>
                  </div>
                </div>

                {/* Quick Action */}
                <button
                  onClick={() => navigate('/purchase/orders', { state: { prefillItem: alert } })}
                  className="btn-secondary w-full text-xs justify-center"
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