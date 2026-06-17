import React from 'react';

const mapStatusStyles = (status = '') => {
  const value = String(status).toLowerCase();
  
  // Active/Success/Approved/Paid
  if (['active', 'success', 'approved', 'paid', 'completed', 'pass', 'resolved'].includes(value)) {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981'
    };
  }
  
  // Warning/Pending/Draft
  if (['warning', 'pending', 'draft', 'scheduled', 'open'].includes(value)) {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b'
    };
  }

  // Danger/Rejected/Overdue
  if (['danger', 'rejected', 'overdue', 'fail', 'cancelled', 'critical'].includes(value)) {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444'
    };
  }

  // Info/Processing
  return {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1'
  };
};

export default function StatusBadge({ status }) {
  const styles = mapStatusStyles(status);
  
  return (
    <span 
      className="inline-flex items-center justify-center text-center"
      style={{
        borderRadius: '20px',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.2',
        ...styles
      }}
    >
      {status}
    </span>
  );
}
