import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Industrial Focused Workspace Modal Component
 * @param {boolean} isOpen - Trigger show/hide
 * @param {Function} onClose - Close handler
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Body content
 * @param {string} size - size helper: 'sm', 'md', 'lg', 'xl'
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
    sm: 'sm:max-w-md',   // ~448px
    md: 'sm:max-w-xl',   // ~576px
    lg: 'sm:max-w-3xl',  // ~768px
    xl: 'sm:max-w-5xl'   // ~1024px
  }[size] || 'sm:max-w-xl';

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Tactical Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[2px] transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Center Container */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-3 sm:p-5 pointer-events-none">
        {/* Modal Dialog Workspace */}
        <div 
          className={`pointer-events-auto relative w-full max-w-[calc(100vw-1.5rem)] ${sizeClasses} max-h-[90vh] flex flex-col transform rounded-sm border border-border-color bg-bg-modal shadow-modal text-left align-middle transition-all duration-150 animate-fadeIn overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          {/* Workspace Pinned Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-color bg-bg-card shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-accent-primary rounded-xs" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary truncate">
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="rounded-xs p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close modal</span>
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 bg-bg-modal text-text-primary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
