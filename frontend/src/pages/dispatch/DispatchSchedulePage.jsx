import React, { useState, useEffect } from 'react';
import { getDispatchSchedule } from '../../api/dispatchApi';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Dispatch Schedule"
        description="Calendar view of shipments scheduled for today and the upcoming week."
        actions={
          <button
            onClick={fetchSchedule}
            className="btn-secondary"
          >
            ↻ Refresh Schedule
          </button>
        }
      />

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}

      {loading ? (
        <div className="sheet p-12 text-center text-text-muted">Loading dispatch schedule...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {weekDates.map((dateStr, idx) => {
            const items = groupedSchedule[dateStr] || [];
            const isToday = idx === 0;

            return (
              <div
                key={dateStr}
                className={`sheet p-3.5 transition-all min-w-0 ${
                  isToday 
                    ? 'border-accent-primary ring-1 ring-accent-primary/20' 
                    : ''
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm ${isToday ? 'text-accent-primary' : 'text-text-primary'}`}>
                    {isToday ? 'Today' : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className="tb-cell">
                    {items.length} {items.length === 1 ? 'Shipment' : 'Shipments'}
                  </span>
                </div>

                <div className="space-y-2.5 mt-3">
                  {items.length === 0 ? (
                    <div className="text-center text-text-muted text-xs py-7 italic border border-dashed border-border-color rounded bg-bg-subtle">
                      No shipments scheduled
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="p-2.5 bg-bg-subtle border border-border-color rounded space-y-2 text-xs">
                        <div className="flex justify-between items-start gap-1">
                          <span className="stamp">{item.challan_no}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <div>
                          <p className="text-text-muted text-[11px]">Customer</p>
                          <p className="text-text-primary font-medium truncate">{item.customer_name}</p>
                        </div>
                        {item.transporter_name && (
                          <div className="pt-1.5 border-t border-border-color text-xs text-text-secondary space-y-0.5">
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