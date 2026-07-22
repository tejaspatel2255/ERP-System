import React from 'react';

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-color bg-bg-card px-6 py-12 text-center transition-colors duration-200">
      {icon && <div className="mb-3 text-3xl text-text-muted">{icon}</div>}
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-text-muted">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
