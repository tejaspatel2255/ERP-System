import React from 'react';

/**
 * Reusable Industrial Pagination Component
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Generate sliding window of page numbers (up to 5 pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className="flex items-center justify-between border-t border-border-color px-2 py-3 select-none">
      {/* Mobile View Simple Navigation */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn btn-sm"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn btn-sm ml-3"
        >
          Next
        </button>
      </div>

      {/* Desktop View Numeric Controls */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
            PAGE <span className="font-bold text-text-primary">{page}</span> /{' '}
            <span className="font-bold text-text-primary">{totalPages}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Prev Button */}
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Previous Page"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Page Numbers */}
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p}
            </button>
          ))}

          {/* Next Button */}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Next Page"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;
