import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border-color bg-bg-card/40 px-6 py-10 text-center transition-colors duration-150 shadow-2xs">
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xs bg-bg-secondary text-text-muted border border-border-color shadow-2xs">
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon size={20} className="text-text-muted" />
          )}
        </div>
      )}
      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-md text-xs text-text-muted leading-relaxed font-sans">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xs bg-accent-primary px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-accent-secondary transition-all"
        >
          <span>+</span> {actionLabel}
        </button>
      )}
    </div>
  );
}
