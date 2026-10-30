import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const STATUS_COLOR = {
  'Pending': { bar: 'bg-text-muted', badge: 'Draft' },
  'In Progress': { bar: 'bg-accent-primary', badge: 'In Progress' },
  'Completed': { bar: 'bg-accent-success', badge: 'Completed' },
  'Cancelled': { bar: 'bg-accent-danger', badge: 'Cancelled' },
  'QA Hold': { bar: 'bg-amber-500', badge: 'QA Hold' }
};

const VIEW_OPTIONS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' }
];

const ProductionSchedulePage = () => {
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('timeline');
  const [rangeKey, setRangeKey] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = () => {
    const now = new Date();
    if (rangeKey === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: mon, end: sun };
    }
    if (rangeKey === 'month') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    }
    return { start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1), end: customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  };

  const fetchWOs = useCallback(async () => {
    const { start, end } = getDateRange();
    const fmt = d => d.toISOString().slice(0, 10);
    setLoading(true);
    try {
      const d = await getWorkOrders({ startDate: fmt(start), endDate: fmt(end) });
      if (d.success) setWos(d.workOrders.filter(wo => wo.planned_start));
    } catch { toast.error('Failed to load schedule.'); }
    finally { setLoading(false); }
  }, [rangeKey, customStart, customEnd]);

  useEffect(() => { fetchWOs(); }, [fetchWOs]);

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const rangeDays = Math.max(1, Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1);

  const getBarStyle = (wo) => {
    const woStart = new Date(wo.planned_start);
    const woEnd = wo.planned_end ? new Date(wo.planned_end) : new Date(wo.planned_start);
    const offsetDays = Math.max(0, (woStart - rangeStart) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, Math.ceil((woEnd - woStart) / (1000 * 60 * 60 * 24)) + 1);
    const left = (offsetDays / rangeDays) * 100;
    const width = Math.min(100 - left, (durationDays / rangeDays) * 100);
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  // Build day header for timeline
  const days = [];
  for (let i = 0; i < Math.min(rangeDays, 31); i++) {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i);
    days.push(d);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Production Schedule"
        description="Gantt-style timeline view of work orders by planned date range."
        actions={
          <div className="flex rounded-none border border-border-color overflow-hidden bg-bg-card">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${viewMode === 'timeline' ? 'bg-accent-primary text-white font-bold' : 'text-text-secondary hover:bg-bg-hover'}`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${viewMode === 'list' ? 'bg-accent-primary text-white font-bold' : 'text-text-secondary hover:bg-bg-hover'}`}
            >
              List
            </button>
          </div>
        }
      />

      {/* Range selector */}
      <div className="sheet p-3 flex flex-wrap gap-2 items-center bg-bg-secondary">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setRangeKey(opt.key)}
            className={`btn px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${rangeKey === opt.key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {opt.label}
          </button>
        ))}
        {rangeKey === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="field py-1 px-2 text-xs font-mono w-auto"
            />
            <span className="text-text-muted text-xs font-mono">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="field py-1 px-2 text-xs font-mono w-auto"
            />
          </div>
        )}
        <span className="font-mono text-xs text-text-muted ml-auto">
          {wos.length} work order{wos.length !== 1 ? 's' : ''} in range
        </span>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" /></div>
      ) : wos.length === 0 ? (
        <div className="sheet p-16 text-center text-text-muted font-mono text-xs">No work orders scheduled in this date range.</div>
      ) : viewMode === 'timeline' ? (
        <div className="sheet overflow-hidden">
          {/* Day header */}
          <div className="flex border-b border-border-color bg-bg-secondary font-mono">
            <div className="w-56 shrink-0 px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider border-r border-border-color">
              Work Order
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex h-10">
                {days.map((d, i) => (
                  <div key={i} className="flex-1 border-r border-border-color/50 flex items-center justify-center">
                    <span className={`text-[9px] font-semibold text-center leading-tight ${d.toDateString() === new Date().toDateString() ? 'text-accent-primary font-bold' : 'text-text-secondary'}`}>
                      {d.getDate()}<br /><span className="font-normal text-[8px] text-text-muted">{d.toLocaleString('default', { month: 'short' })}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WO Rows */}
          <div className="divide-y divide-border-color font-sans">
            {wos.map(wo => {
              const colors = STATUS_COLOR[wo.status] || STATUS_COLOR['Pending'];
              const barStyle = getBarStyle(wo);
              return (
                <div key={wo.id} className="flex hover:bg-bg-hover">
                  <div className="w-56 shrink-0 px-4 py-3 border-r border-border-color space-y-1">
                    <div className="font-mono text-xs font-bold text-text-primary">{wo.wo_no}</div>
                    <div className="text-[11px] text-text-muted truncate max-w-[180px]">{wo.finished_item_name}</div>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="flex-1 relative py-3 px-1">
                    <div className="h-7 relative">
                      <div
                        className={`absolute top-0 h-7 rounded-none flex items-center px-2 ${colors.bar} text-white font-mono transition-all border border-black/20 shadow-xs`}
                        style={barStyle}
                      >
                        <span className="text-[9px] font-bold truncate">{parseFloat(wo.planned_qty)} units</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // List view
        <div className="sheet overflow-hidden">
          <table className="w-full text-xs font-mono border-collapse">
            <thead className="bg-bg-secondary border-b border-border-color text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                {['WO No','Finished Item','Planned Qty','Planned Start','Planned End','Actual Start','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color font-sans">
              {wos.map(wo => (
                <tr key={wo.id} className="hover:bg-bg-hover">
                  <td className="px-4 py-3 font-mono font-bold text-text-primary text-xs">{wo.wo_no}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-text-primary">{wo.finished_item_name}</div>
                    <div className="font-mono text-[10px] text-text-muted">{wo.finished_item_code}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{parseFloat(wo.planned_qty)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary">{formatDate(wo.planned_start)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary">{formatDate(wo.planned_end)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-accent-primary">{wo.actual_start ? formatDate(wo.actual_start) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductionSchedulePage;
