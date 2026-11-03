import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getWorkOrders } from '../../api/productionApi';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';

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

  const getBarColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-[var(--success-rail)]';
      case 'In Progress': return 'bg-[var(--accent-primary)]';
      case 'QA Hold': return 'bg-[var(--warning-rail)]';
      case 'Cancelled': return 'bg-[var(--danger-rail)]';
      default: return 'bg-[var(--text-muted)]';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Production Schedule"
        subtitle="Gantt-style timeline view of work orders by planned date range."
        actions={
          <div className="flex rounded-md border border-border-color overflow-hidden p-0.5 bg-bg-card">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}>Timeline</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}>List</button>
          </div>
        }
      />

      {/* Range selector */}
      <div className="sheet p-3 flex flex-wrap gap-2 items-center">
        {VIEW_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setRangeKey(opt.key)} className={`btn-sm ${rangeKey === opt.key ? 'btn-primary' : 'btn-secondary'}`}>{opt.label}</button>
        ))}
        {rangeKey === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="field py-1.5 px-3 text-xs" />
            <span className="text-text-muted text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="field py-1.5 px-3 text-xs" />
          </div>
        )}
        <span className="text-xs text-text-muted ml-auto">{wos.length} work order{wos.length !== 1 ? 's' : ''} in range</span>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" /></div>
      ) : wos.length === 0 ? (
        <div className="sheet py-20 text-center text-text-muted">No work orders scheduled in this date range.</div>
      ) : viewMode === 'timeline' ? (
        <div className="sheet overflow-hidden">
          {/* Day header */}
          <div className="flex border-b border-border-color bg-bg-subtle">
            <div className="w-56 shrink-0 px-4 py-3 text-xs font-semibold text-text-secondary border-r border-border-color uppercase tracking-wider">Work Order</div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex h-12">
                {days.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} className={`flex-1 border-r border-border-color flex items-center justify-center p-1 text-center ${isToday ? 'border-accent-primary bg-[var(--info-bg)]' : ''}`}>
                      <span className={`text-xs font-semibold leading-tight ${isToday ? 'text-accent-primary' : 'text-text-muted'}`}>
                        {d.getDate()}<br /><span className="font-normal text-[10px]">{d.toLocaleString('default', { month: 'short' })}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* WO Rows */}
          <div className="divide-y divide-border-color">
            {wos.map(wo => {
              const barStyle = getBarStyle(wo);
              const barColor = getBarColor(wo.status);
              return (
                <div key={wo.id} className="flex hover:bg-bg-subtle transition-colors">
                  <div className="w-56 shrink-0 px-4 py-3 border-r border-border-color space-y-1">
                    <div className="text-xs font-semibold text-text-primary"><span className="stamp">{wo.wo_no}</span></div>
                    <div className="text-xs text-text-secondary truncate max-w-[180px]">{wo.finished_item_name}</div>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="flex-1 relative py-3 px-1">
                    <div className="h-7 relative">
                      <div
                        className={`absolute top-0 h-7 rounded flex items-center px-2 text-white ${barColor} opacity-90 transition-all shadow-sm`}
                        style={barStyle}
                      >
                        <span className="text-white text-xs font-semibold truncate tabular-nums">{parseFloat(wo.planned_qty)} units</span>
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
          <table className="bom w-full text-sm">
            <thead>
              <tr>
                {['WO No','Finished Item','Planned Qty','Planned Start','Planned End','Actual Start','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wos.map(wo => {
                return (
                  <tr key={wo.id} className="bom-row">
                    <td className="px-4 py-3 font-medium text-xs"><span className="stamp">{wo.wo_no}</span></td>
                    <td className="px-4 py-3 text-xs"><div className="font-medium text-text-primary">{wo.finished_item_name}</div><div className="text-xs text-text-muted"><span className="stamp">{wo.finished_item_code}</span></div></td>
                    <td className="px-4 py-3 text-xs tabular-nums">{parseFloat(wo.planned_qty)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-text-muted">{formatDate(wo.planned_start)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-text-muted">{formatDate(wo.planned_end)}</td>
                    <td className="px-4 py-3 text-xs text-accent-primary tabular-nums">{wo.actual_start ? formatDate(wo.actual_start) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
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

export default ProductionSchedulePage;