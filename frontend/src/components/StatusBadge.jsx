import React from 'react';

const mapStatusTheme = (status = '') => {
  const value = String(status).toLowerCase();

  // Success / Active / Approved / Completed / Pass / Paid / Resolved / Verified
  if (['active', 'success', 'approved', 'paid', 'completed', 'pass', 'resolved', 'in stock', 'verified'].includes(value)) {
    return {
      style: {
        '--tag-bg': 'var(--success-bg)',
        '--tag-text': 'var(--success-text)',
        '--tag-border': 'var(--success-border)',
        '--lamp': 'var(--accent-success)'
      }
    };
  }

  // Warning / Pending / Draft / Scheduled / Open / Reorder / Low Stock
  if (['warning', 'pending', 'draft', 'scheduled', 'open', 'reorder', 'low stock', 'inspection required', 'in progress'].includes(value)) {
    return {
      style: {
        '--tag-bg': 'var(--warning-bg)',
        '--tag-text': 'var(--warning-text)',
        '--tag-border': 'var(--warning-border)',
        '--lamp': 'var(--accent-warning)'
      }
    };
  }

  // Danger / Rejected / Overdue / Fail / Cancelled / Critical / Out of Stock / Void
  if (['danger', 'rejected', 'changes requested', 'changes_requested', 'overdue', 'fail', 'cancelled', 'critical', 'out of stock', 'expired', 'void'].includes(value)) {
    return {
      style: {
        '--tag-bg': 'var(--danger-bg)',
        '--tag-text': 'var(--danger-text)',
        '--tag-border': 'var(--danger-border)',
        '--lamp': 'var(--accent-danger)'
      }
    };
  }

  // Info / Processing / Issued / Shipped / En-Route / New
  return {
    style: {
      '--tag-bg': 'var(--info-bg)',
      '--tag-text': 'var(--info-text)',
      '--tag-border': 'var(--info-border)',
      '--lamp': 'var(--accent-info)'
    }
  };
};

export default function StatusBadge({ status, label, className = '' }) {
  const theme = mapStatusTheme(status);

  return (
    <span
      style={theme.style}
      className={`andon-tag font-mono-tabular ${className}`}
    >
      <span className="lamp" />
      <span>{label || status || 'Unknown'}</span>
    </span>
  );
}
