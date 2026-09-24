import React from 'react';

/**
 * Shared Industrial Page Header Component
 */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 mb-6 border-b border-border-color/60 pb-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-1.5 bg-accent-primary rounded-xs shrink-0" />
          <h1 className="text-2xl font-mono font-bold tracking-tight text-text-primary uppercase sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-sans tracking-normal leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions || children}
        </div>
      )}
    </div>
  );
}
