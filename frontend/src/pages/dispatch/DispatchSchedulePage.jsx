import React, { useState, useEffect } from 'react';
import { getDispatchSchedule } from '../../api/dispatchApi';

export default function DispatchSchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await getDispatchSchedule();
      setSchedule(res.schedule || []);
    } catch (err) {
      setError('Failed to load dispatch schedule.');
    } finally {
      setLoading(false);
    }
  };

  // Group schedule items by date
  const groupedSchedule = schedule.reduce((groups, item) => {
    const dateStr = item.dispatch_date ? new Date(item.dispatch_date).toDateString() : 'Unscheduled';
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(item);
    return groups;
  }, {});

  // Get days of the week starting from today
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      dates.push(nextDate.toDateString());
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Dispatch Schedule</h1>
          <p className="text-slate-400 text-sm mt-1">Calendar view of shipments scheduled for today and the upcoming week.</p>
        </div>
        <button
          onClick={fetchSchedule}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg border border-slate-700 transition-all text-sm"
        >
          Refresh Schedule
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading dispatch schedule...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {weekDates.map((dateStr, idx) => {
            const items = groupedSchedule[dateStr] || [];
            const isToday = idx === 0;

            return (
              <div
                key={dateStr}
                className={`rounded-xl border p-4 backdrop-blur-md transition-all ${
                  isToday 
                    ? 'bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-500/5' 
                    : 'bg-slate-800/40 border-slate-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-bold ${isToday ? 'text-blue-400' : 'text-slate-200'}`}>
                    {isToday ? 'Today' : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    items.length > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700/30 text-slate-500'
                  }`}>
                    {items.length} Shipments
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  {items.length === 0 ? (
                    <div className="text-center text-slate-500 text-xs py-6 italic">No shipments scheduled</div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-emerald-400 font-bold">{item.challan_no}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.status === 'Dispatched' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Customer</p>
                          <p className="text-white font-bold">{item.customer_name}</p>
                        </div>
                        {item.transporter_name && (
                          <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                            <p><span className="text-slate-500">Carrier:</span> {item.transporter_name}</p>
                            <p><span className="text-slate-500">Vehicle:</span> {item.vehicle_no}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
