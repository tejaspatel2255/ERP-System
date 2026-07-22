import React from 'react';

/**
 * Reusable Pagination Component
 * @param {number} page - Current active page (1-indexed)
 * @param {number} totalPages - Total count of pages
 * @param {Function} onPageChange - Callback when a page changes
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
    <nav className="flex items-center justify-between border-t border-border-color px-4 py-3 sm:px-6 transition-colors duration-200">
      {/* Mobile view simple buttons */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="relative inline-flex items-center rounded-xl border border-border-color bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="relative ml-3 inline-flex items-center rounded-xl border border-border-color bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {/* Desktop view with specific page numbers */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-muted">
            Showing page <span className="font-mono-tabular font-bold text-text-primary">{page}</span> of{' '}
            <span className="font-mono-tabular font-bold text-text-primary">{totalPages}</span>
          </p>
        </div>
        <div>
          <span className="isolate inline-flex -space-x-px rounded-xl shadow-xs bg-bg-secondary border border-border-color overflow-hidden">
            {/* Prev Button */}
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="relative inline-flex items-center px-3 py-2 text-text-muted hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Page Numbers */}
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold font-mono-tabular transition-colors ${
                  p === page
                    ? 'bg-accent-primary text-white font-bold'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}

            {/* Next Button */}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="relative inline-flex items-center px-3 py-2 text-text-muted hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;
