import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';

const STATUS_COLOR = {
  'Pending': { bar: 'bg-slate-400', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  'In Progress': { bar: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Completed': { bar: 'bg-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-800 border-green-200' },
  'Cancelled': { bar: 'bg-red-400', text: 'text-red-600', badge: 'bg-red-100 text-red-800 border-red-200' },
  'QA Hold': { bar: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Production Schedule</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gantt-style timeline view of work orders by planned date range.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Timeline</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>List</button>
          </div>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center">
        {VIEW_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setRangeKey(opt.key)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${rangeKey === opt.key ? 'bg-blue-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>{opt.label}</button>
        ))}
        {rangeKey === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none" />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none" />
          </>
        )}
        <span className="text-xs text-slate-400 ml-auto">{wos.length} work order{wos.length !== 1 ? 's' : ''} in range</span>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : wos.length === 0 ? (
        <div className="py-20 text-center text-slate-400">No work orders scheduled in this date range.</div>
      ) : viewMode === 'timeline' ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
          {/* Day header */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70">
            <div className="w-56 shrink-0 px-4 py-3 text-xs font-bold text-slate-500 uppercase border-r border-slate-200 dark:border-slate-800">Work Order</div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex h-10">
                {days.map((d, i) => (
                  <div key={i} className="flex-1 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    <span className={`text-[9px] font-semibold ${d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-slate-400'}`}>
                      {d.getDate()}<br /><span className="font-normal">{d.toLocaleString('default', { month: 'short' })}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WO Rows */}
          {wos.map(wo => {
            const colors = STATUS_COLOR[wo.status] || STATUS_COLOR['Pending'];
            const barStyle = getBarStyle(wo);
            return (
              <div key={wo.id} className="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <div className="w-56 shrink-0 px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{wo.wo_no}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{wo.finished_item_name}</div>
                  <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold border mt-0.5 ${colors.badge}`}>{wo.status}</span>
                </div>
                <div className="flex-1 relative py-3 px-1">
                  <div className="h-7 relative">
                    <div
                      className={`absolute top-0 h-7 rounded-lg flex items-center px-2 ${colors.bar} opacity-80 transition-all`}
                      style={barStyle}
                    >
                      <span className="text-white text-[9px] font-bold truncate">{parseFloat(wo.planned_qty)} units</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List view
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {['WO No','Finished Item','Planned Qty','Planned Start','Planned End','Actual Start','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {wos.map(wo => {
                const colors = STATUS_COLOR[wo.status] || STATUS_COLOR['Pending'];
                return (
                  <tr key={wo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-xs">{wo.wo_no}</td>
                    <td className="px-4 py-3 text-xs"><div className="font-medium text-slate-900 dark:text-white">{wo.finished_item_name}</div><div className="text-[10px] text-slate-400">{wo.finished_item_code}</div></td>
                    <td className="px-4 py-3 text-xs">{parseFloat(wo.planned_qty)}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(wo.planned_start)}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(wo.planned_end)}</td>
                    <td className="px-4 py-3 text-xs text-blue-600">{wo.actual_start ? formatDate(wo.actual_start) : '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${colors.badge}`}>{wo.status}</span></td>
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
