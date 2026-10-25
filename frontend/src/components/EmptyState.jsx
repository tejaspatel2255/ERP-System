import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border-color bg-bg-card/40 p-8 text-center transition-colors duration-150">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center border border-border-color bg-bg-secondary text-text-muted">
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon size={24} className="text-text-muted" />
          )}
        </div>
      )}
      <h3 className="font-display uppercase tracking-wider text-lg text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-text-muted leading-relaxed font-sans">{description}</p>}
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
