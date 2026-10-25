import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Shared Industrial Page Header Component (Drawing-sheet title block)
 */
export default function PageHeader({ title, description, actions, children }) {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const rawSheet = segments.length > 0 ? segments[segments.length - 1] : 'MAIN';
  const sheetName = rawSheet.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 14);
  const formattedDate = new Date().toLocaleDateString('en-GB');

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 bg-accent-primary rounded-none shrink-0" />
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide text-text-primary uppercase truncate">
              {title}
            </h1>
          </div>
          {description && (
            <p className="mt-1 text-sm text-text-secondary font-sans tracking-normal leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Decorative Drawing Sheet Title Block Cells (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className="tb-cell">
              SHEET <b>{sheetName || 'ROOT'}</b>
            </div>
            <div className="tb-cell">
              REV <b>A</b>
            </div>
            <div className="tb-cell">
              DATE <b>{formattedDate}</b>
            </div>
          </div>

          {(actions || children) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {actions || children}
            </div>
          )}
        </div>
      </div>

      {/* Drawing-sheet bottom datum line */}
      <div className="relative border-b border-border-color">
        <div className="h-[2px] bg-accent-primary draw-line w-full" />
      </div>
    </div>
  );
}
