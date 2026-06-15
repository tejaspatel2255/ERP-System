import React from 'react';

const mapStatus = (status = '') => {
  const value = String(status).toLowerCase();
  if (['draft', 'pending'].includes(value)) return 'bg-slate-200 text-slate-800';
  if (['submitted', 'sent'].includes(value)) return 'bg-blue-100 text-blue-800';
  if (['approved', 'active', 'completed', 'pass', 'paid', 'resolved'].includes(value)) return 'bg-emerald-100 text-emerald-800';
  if (['rejected', 'fail', 'cancelled', 'overdue', 'critical'].includes(value)) return 'bg-red-100 text-red-800';
  if (['in progress', 'partial', 'partial payment'].includes(value)) return 'bg-orange-100 text-orange-800';
  if (['scheduled', 'open'].includes(value)) return 'bg-yellow-100 text-yellow-800';
  return 'bg-slate-200 text-slate-800';
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${mapStatus(status)}`}>
      {status}
    </span>
  );
}
