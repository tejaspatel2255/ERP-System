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
  const val = String(status || '').toLowerCase();
  const isDanger = ['danger', 'rejected', 'overdue', 'fail', 'cancelled', 'critical', 'out of stock', 'expired'].includes(val);

  return (
    <span
      className={`andon-tag ${className}`}
      style={{
        '--tag-bg': theme.bg,
        '--tag-text': theme.color,
        '--tag-border': theme.border
      }}
    >
      <span
        className={`lamp ${isDanger ? 'lamp-pulse' : ''}`}
        style={{ '--lamp': theme.rail }}
      />
      <span>{status || 'UNKNOWN'}</span>
    </span>
  );
}
