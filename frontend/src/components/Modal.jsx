import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Industrial Focused Drawing-Sheet Modal Component
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
        className="fixed inset-0 bg-[#07111F]/70 backdrop-blur-[2px] transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Center Container */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-3 sm:p-5 pointer-events-none">
        {/* Modal Dialog Workspace */}
        <div 
          className={`pointer-events-auto relative w-full max-w-[calc(100vw-1.5rem)] ${sizeClasses} max-h-[90vh] flex flex-col sheet bg-bg-modal border-border-strong shadow-modal text-left align-middle transition-all duration-150 animate-fadeIn overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          {/* Top Hazard Strip */}
          <div className="hazard-strip shrink-0" />

          {/* Workspace Pinned Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-color bg-bg-card shrink-0 select-none">
            <div className="min-w-0 pr-2">
              <span className="sheet-tag block">WORK INSTRUCTION</span>
              <h3 className="text-xl font-display uppercase tracking-wide text-text-primary truncate">
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close modal</span>
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 bg-bg-modal text-text-primary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
