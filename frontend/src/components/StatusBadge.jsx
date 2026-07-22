import React from 'react';

const mapStatusTheme = (status = '') => {
  const value = String(status).toLowerCase();

  // Success / Active / Approved / Completed / Pass / Paid / Resolved
  if (['active', 'success', 'approved', 'paid', 'completed', 'pass', 'resolved', 'in stock', 'verified'].includes(value)) {
    return {
      bg: 'var(--success-bg)',
      color: 'var(--success-text)',
      border: 'var(--success-border)',
      rail: 'var(--success-rail)'
    };
  }

  // Warning / Pending / Draft / Scheduled / Open / Reorder / Low Stock
  if (['warning', 'pending', 'draft', 'scheduled', 'open', 'reorder', 'low stock', 'inspection required', 'in progress'].includes(value)) {
    return {
      bg: 'var(--warning-bg)',
      color: 'var(--warning-text)',
      border: 'var(--warning-border)',
      rail: 'var(--warning-rail)'
    };
  }

  // Danger / Rejected / Overdue / Fail / Cancelled / Critical / Out of Stock
  if (['danger', 'rejected', 'overdue', 'fail', 'cancelled', 'critical', 'out of stock', 'expired'].includes(value)) {
    return {
      bg: 'var(--danger-bg)',
      color: 'var(--danger-text)',
      border: 'var(--danger-border)',
      rail: 'var(--danger-rail)'
    };
  }

  // Info / Processing / Issued / Shipped / En-Route / New
  return {
    bg: 'var(--info-bg)',
    color: 'var(--info-text)',
    border: 'var(--info-border)',
    rail: 'var(--info-rail)'
  };
};

export default function StatusBadge({ status, className = '' }) {
  const theme = mapStatusTheme(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase font-mono-tabular transition-colors shadow-2xs ${className}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.color,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: theme.border,
        borderLeftWidth: '3px',
        borderLeftColor: theme.rail
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: theme.rail }}
      />
      <span>{status || 'UNKNOWN'}</span>
    </span>
  );
}
