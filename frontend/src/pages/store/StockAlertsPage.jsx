import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getStockAlerts } from '../../api/storeApi';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ShoppingCart, AlertCircle, ArrowRight, PackageX, Layers } from 'lucide-react';

const formatQty = (qty) => {
  const num = parseFloat(qty) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

const StockAlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'REORDER'

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getStockAlerts();
      if (data.success) setAlerts(data.alerts);
    } catch {
      toast.error('Failed to load stock alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const metrics = useMemo(() => {
    const outOfStockCount = alerts.filter(a => parseFloat(a.current_stock) <= 0).length;
    const atReorderCount = alerts.filter(a => parseFloat(a.current_stock) > 0).length;
    const totalShortageUnits = alerts.reduce((sum, a) => sum + Math.max(0, parseFloat(a.shortage || 0)), 0);
    return { outOfStockCount, atReorderCount, totalShortageUnits };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filterSeverity === 'CRITICAL') {
      return alerts.filter(a => parseFloat(a.current_stock) <= 0);
    }
    if (filterSeverity === 'REORDER') {
      return alerts.filter(a => parseFloat(a.current_stock) > 0);
    }
    return alerts;
  }, [alerts, filterSeverity]);

  const getAlertConfig = (ratio, currentStock) => {
    if (currentStock <= 0) {
      return {
        label: 'Critical',
        rail: 'var(--danger-rail)',
        borderCls: 'border-l-4 border-l-[var(--danger-rail)]',
        isCritical: true
      };
    }
    if (ratio <= 50) {
      return {
        label: 'Low',
        rail: 'var(--warning-rail)',
        borderCls: 'border-l-4 border-l-[var(--warning-rail)]',
        isCritical: false
      };
    }
    return {
      label: 'At Reorder',
      rail: 'var(--accent-primary)',
      borderCls: 'border-l-4 border-l-[var(--accent-primary)]',
      isCritical: false
    };
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Stock Reorder Alerts"
        subtitle={`Items at or below reorder level — ${alerts.length} active inventory alert${alerts.length !== 1 ? 's' : ''}.`}
        actions={
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sheet p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">Critical Out of Stock</p>
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {metrics.outOfStockCount} <span className="text-xs font-normal text-text-secondary">items</span>
            </p>
          </div>
        </div>

        <div className="sheet p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--warning-bg)] text-[var(--warning-text)] flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">Threshold / At Reorder</p>
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {metrics.atReorderCount} <span className="text-xs font-normal text-text-secondary">items</span>
            </p>
          </div>
        </div>

        <div className="sheet p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bg-hover text-accent-primary flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">Total Deficit to Order</p>
            <p className="text-lg font-bold text-accent-primary tabular-nums">
              {formatQty(metrics.totalShortageUnits)} <span className="text-xs font-normal text-text-secondary">units</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-border-color pb-3">
        <span className="text-xs font-semibold text-text-muted mr-1">Filter alerts:</span>
        <button
          type="button"
          onClick={() => setFilterSeverity('ALL')}
          className={`btn btn-sm ${filterSeverity === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
        >
          All alerts ({alerts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSeverity('CRITICAL')}
          className={`btn btn-sm ${filterSeverity === 'CRITICAL' ? 'btn-danger' : 'btn-ghost'}`}
        >
          Critical (0 Stock) ({metrics.outOfStockCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterSeverity('REORDER')}
          className={`btn btn-sm ${filterSeverity === 'REORDER' ? 'btn-primary' : 'btn-ghost'}`}
        >
          At Reorder Point ({metrics.atReorderCount})
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
          <p className="text-xs text-text-muted">Loading reorder alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="sheet py-16 flex flex-col items-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
            <span className="text-xl">✓</span>
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            {filterSeverity === 'ALL' ? 'All items are well-stocked' : 'No items match this filter'}
          </h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm">
            {filterSeverity === 'ALL'
              ? 'No items are currently at or below their reorder levels. Inventory levels are healthy.'
              : 'Try selecting a different filter above to view other active alerts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const ratio = parseFloat(alert.stock_ratio_pct) || 0;
            const currentStock = parseFloat(alert.current_stock) || 0;
            const reorderLevel = parseFloat(alert.reorder_level) || 0;
            const shortage = parseFloat(alert.shortage) || 0;
            const { label, rail, borderCls } = getAlertConfig(ratio, currentStock);

            return (
              <div key={alert.id} className={`sheet p-4 space-y-4 ${borderCls} flex flex-col justify-between`}>
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-primary text-sm leading-tight truncate" title={alert.name}>
                        {alert.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="stamp font-mono font-medium">{alert.item_code}</span>
                        <span>•</span>
                        <span className="text-text-secondary">{alert.category_name || 'Standard Item'}</span>
                      </p>
                    </div>
                    <StatusBadge status={label} />
                  </div>

                  {/* Stock Level Progress */}
                  <div className="space-y-1.5 bg-bg-card p-2.5 rounded-lg border border-border-color">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary font-medium">Stock vs Reorder Point</span>
                      <span className="text-text-primary font-mono font-bold tabular-nums">
                        {ratio.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress h-2 bg-bg-hover rounded-full overflow-hidden">
                      <span
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(ratio, 100)}%`,
                          background: rail
                        }}
                      />
                    </div>
                  </div>

                  {/* 3 Metrics Block */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Current Stock */}
                    <div className={`rounded-lg p-2.5 border ${currentStock <= 0 ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]' : 'bg-bg-subtle border-border-color'}`}>
                      <p className={`text-[11px] font-medium ${currentStock <= 0 ? 'text-[var(--danger-text)]' : 'text-text-muted'}`}>
                        Current Stock
                      </p>
                      <p className={`text-base font-bold tabular-nums font-mono mt-0.5 ${currentStock <= 0 ? 'text-[var(--danger-text)]' : 'text-text-primary'}`}>
                        {formatQty(currentStock)}
                      </p>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{alert.unit || 'Units'}</p>
                    </div>

                    {/* Reorder Level */}
                    <div className="rounded-lg bg-bg-subtle border border-border-color p-2.5">
                      <p className="text-[11px] text-text-muted font-medium">Reorder At</p>
                      <p className="text-base font-bold text-text-primary tabular-nums font-mono mt-0.5">
                        {formatQty(reorderLevel)}
                      </p>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{alert.unit || 'Units'}</p>
                    </div>

                    {/* Deficit / Shortage */}
                    <div
                      className={`rounded-lg p-2.5 border ${
                        shortage > 0
                          ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-text)]'
                          : 'bg-bg-subtle border-border-color text-text-secondary'
                      }`}
                    >
                      <p className="text-[11px] font-medium">
                        {shortage > 0 ? 'Shortage' : 'Threshold'}
                      </p>
                      <p className="text-base font-bold tabular-nums font-mono mt-0.5">
                        {shortage > 0 ? `-${formatQty(shortage)}` : 'Met'}
                      </p>
                      <p className="text-[10px] opacity-80 truncate mt-0.5">
                        {shortage > 0 ? (alert.unit || 'Units') : 'At buffer'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/purchase/orders', { state: { prefillItem: alert } })}
                    className="btn btn-primary btn-sm w-full inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Raise Purchase Order</span>
                    <ArrowRight className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockAlertsPage;