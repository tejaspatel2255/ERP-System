import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

      {/* Desktop view with specific page numbers */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Showing page <span className="font-mono-tabular font-semibold text-text-primary">{page}</span> of{' '}
            <span className="font-mono-tabular font-semibold text-text-primary">{totalPages}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Prev Button */}
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="btn btn-sm btn-icon"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`btn btn-sm font-mono-tabular min-w-[28px] ${
                p === page
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {p}
            </button>
          ))}

          {/* Next Button */}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="btn btn-sm btn-icon"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;
