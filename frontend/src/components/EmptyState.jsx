import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="sheet flex flex-col items-center justify-center p-8 sm:p-12 text-center">
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-bg-hover text-text-muted">
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon size={22} className="text-text-muted" />
          )}
        </div>
      )}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-text-secondary leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary btn-sm mt-4"
        >
          <span>+</span> {actionLabel}
        </button>
      )}
    </div>
  );
}
