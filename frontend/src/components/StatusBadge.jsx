import React from 'react';

const mapStatusTheme = (status = '') => {
  const value = String(status).toLowerCase();

  // Success / Active / Approved / Completed / Pass / Paid / Resolved / Verified
  if (['active', 'success', 'approved', 'paid', 'completed', 'pass', 'resolved', 'in stock', 'verified'].includes(value)) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-800/80',
      dot: 'bg-emerald-500'
    };
  }

  // Warning / Pending / Draft / Scheduled / Open / Reorder / Low Stock
  if (['warning', 'pending', 'draft', 'scheduled', 'open', 'reorder', 'low stock', 'inspection required', 'in progress'].includes(value)) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-800/80',
      dot: 'bg-amber-500'
    };
  }

  // Danger / Rejected / Overdue / Fail / Cancelled / Critical / Out of Stock / Void
  if (['danger', 'rejected', 'overdue', 'fail', 'cancelled', 'critical', 'out of stock', 'expired', 'void'].includes(value)) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200/80 dark:border-rose-800/80',
      dot: 'bg-rose-500'
    };
  }

  // Info / Processing / Issued / Shipped / En-Route / New
  return {
    bg: 'bg-blue-500/10 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200/80 dark:border-blue-800/80',
    dot: 'bg-blue-500'
  };
};

export default function StatusBadge({ status, className = '' }) {
  const theme = mapStatusTheme(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold   font-mono-tabular border transition-colors shadow-2xs ${theme.bg} ${theme.text} ${theme.border} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${theme.dot}`} />
      <span>{status || 'UNKNOWN'}</span>
    </span>
  );
}
