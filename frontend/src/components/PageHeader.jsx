import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Shared Page Header Component
 * @param {string} title - Page title
 * @param {string} description - Page subtitle / description
 * @param {React.ReactNode} actions - Header action buttons (e.g. Create button)
 * @param {React.ReactNode} children - Optional extra header content
 */
export default function PageHeader({ title, description, actions, children }) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <div className="mb-5 space-y-2">
      {/* Row 1 — Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
        <Link to="/dashboard" className="text-text-muted hover:text-accent-primary transition-colors">
          Home
        </Link>
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const formattedSegment = decodeURIComponent(segment)
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          const routeTo = `/${pathSegments.slice(0, index + 1).join('/')}`;

          return (
            <React.Fragment key={routeTo}>
              <ChevronRight size={12} className="text-text-muted shrink-0" />
              {isLast ? (
                <span className="text-text-secondary font-medium">{formattedSegment}</span>
              ) : (
                <Link to={routeTo} className="text-text-muted hover:text-accent-primary transition-colors">
                  {formattedSegment}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Row 2 — Title, description & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-7 font-semibold text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {(actions || children) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions || children}
          </div>
        )}
      </div>
    </div>
  );
}
