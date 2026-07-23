import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-color bg-bg-card/50 px-6 py-12 text-center transition-colors duration-200 shadow-sm">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted border border-border-color shadow-sm">
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon size={26} className="text-text-muted" />
          )}
        </div>
      )}
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-xs text-text-muted leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
        >
          <span>+</span> {actionLabel}
        </button>
      )}
    </div>
  );
}
