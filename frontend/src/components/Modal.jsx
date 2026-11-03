import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable Modal Component with React Portal rendering directly into document.body
 * @param {boolean} isOpen - Trigger show/hide
 * @param {Function} onClose - Close handler
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Body content
 * @param {string} size - size helper: 'sm' (~448px), 'md' (~576px), 'lg' (~768px), 'xl' (~1024px)
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
    sm: 'sm:max-w-md',   // ~448px (Confirmation dialogs, single inputs)
    md: 'sm:max-w-xl',   // ~576px (Standard forms)
    lg: 'sm:max-w-3xl',  // ~768px (Content-heavy forms, checklists)
    xl: 'sm:max-w-5xl'   // ~1024px (Table-heavy modals, documents)
  }[size] || 'sm:max-w-xl';

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Positioning Container */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* Modal Dialog Box */}
        <div 
          className={`pointer-events-auto relative w-full max-w-[calc(100vw-2rem)] ${sizeClasses} max-h-[90vh] flex flex-col transform rounded-lg border border-border-color bg-bg-modal shadow-modal text-left align-middle transition-all duration-200 animate-fadeIn overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          {/* Integrated Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-color shrink-0 select-none">
            <h3 className="text-base font-semibold text-text-primary truncate mr-3">
              {title}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close modal</span>
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content Body Area */}
          <div className="flex-1 overflow-y-auto p-5 text-text-primary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
