import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { getDispatchSchedule } from '../../api/dispatchApi';
import PageHeader from '../../components/PageHeader';

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
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Dispatch Schedule"
        description="Calendar view of shipments scheduled for today and the upcoming week."
        actions={
          <button
            onClick={fetchSchedule}
            className="inline-flex items-center justify-center rounded-xl bg-bg-card border border-border-color px-4 py-2.5 text-sm font-semibold text-text-primary shadow-brand hover:bg-bg-hover transition-colors"
          >
            Refresh Schedule
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-text-muted bg-bg-card border border-border-color rounded-2xl">Loading dispatch schedule...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {weekDates.map((dateStr, idx) => {
            const items = groupedSchedule[dateStr] || [];
            const isToday = idx === 0;

            return (
              <div
                key={dateStr}
                className={`rounded-2xl border p-4 shadow-brand transition-all min-w-0 ${
                  isToday 
                    ? 'bg-bg-card border-accent-primary/50 shadow-md ring-1 ring-accent-primary/20' 
                    : 'bg-bg-card border-border-color'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-bold text-sm ${isToday ? 'text-accent-primary font-extrabold' : 'text-text-primary'}`}>
                    {isToday ? 'Today' : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    items.length > 0 ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30' : 'bg-bg-secondary text-text-muted border border-border-color'
                  }`}>
                    {items.length} Shipments
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  {items.length === 0 ? (
                    <div className="text-center text-text-muted text-xs py-8 italic border border-dashed border-border-color rounded-xl bg-bg-secondary/40">
                      No shipments scheduled
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="p-3 bg-bg-secondary border border-border-color rounded-xl space-y-2 text-xs shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-accent-primary font-bold">{item.challan_no}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'Delivered' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' :
                            item.status === 'Dispatched' ? 'bg-accent-info/15 text-accent-info border border-accent-info/30' :
                            'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-text-muted font-medium text-[11px]">Customer</p>
                          <p className="text-text-primary font-bold truncate">{item.customer_name}</p>
                        </div>
                        {item.transporter_name && (
                          <div className="pt-2 border-t border-border-color text-[11px] text-text-secondary space-y-0.5">
                            <p><span className="text-text-muted">Carrier:</span> {item.transporter_name}</p>
                            <p><span className="text-text-muted">Vehicle:</span> {item.vehicle_no}</p>
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
