import React from 'react';

/**
 * Shared Page Header Component
 * @param {string} title - Page title
 * @param {string} description - Page subtitle / description
 * @param {React.ReactNode} actions - Header action buttons (e.g. Create button)
 * @param {React.ReactNode} children - Optional extra header content
 */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex items-center gap-3 shrink-0">
          {actions || children}
        </div>
      )}
    </div>
  );
}
