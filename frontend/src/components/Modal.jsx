import React, { useEffect } from 'react';

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Trigger show/hide
 * @param {Function} onClose - Close handler
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Body content
 * @param {string} size - size helper: 'sm', 'md', 'lg'
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl'
  }[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: rgba(0,0,0,0.7) with blur(4px) */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-[4px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box: bg: var(--bg-card), border-radius: 16px, border: 1px solid var(--border-color), shadow */}
      <div 
        className={`relative w-full ${sizeClasses} transform overflow-hidden rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header: border-bottom 1px solid var(--border-color) */}
        <div className="flex items-center justify-between pb-4 border-b border-border-color">
          <h3 className="text-lg font-bold text-text-primary">
            {title}
          </h3>
          <button
            type="button"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            onClick={onClose}
          >
            <span className="sr-only">Close modal</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1 text-text-primary">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
