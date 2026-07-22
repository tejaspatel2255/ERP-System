import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal Component
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
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl'
  }[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-[3px] transition-opacity duration-200">
      {/* Centering Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        {/* Backdrop click dismiss overlay */}
        <div 
          className="fixed inset-0 z-[-1]"
          onClick={onClose}
        />

        {/* Modal Dialog Card Container */}
        <div 
          className={`relative w-full ${sizeClasses} my-6 transform overflow-hidden rounded-2xl border border-border-color bg-bg-modal shadow-modal text-left align-middle transition-all duration-200 animate-fadeIn`}
          role="dialog"
          aria-modal="true"
        >
          {/* Integrated Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-bg-modal">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
              onClick={onClose}
            >
              <span className="sr-only">Close modal</span>
              <X size={18} />
            </button>
          </div>

          {/* Integrated Content Body */}
          <div className="px-6 py-5 max-h-[calc(85vh-100px)] overflow-y-auto bg-bg-modal text-text-primary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
