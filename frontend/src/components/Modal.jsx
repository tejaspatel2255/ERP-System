import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable Modal Component with React Portal rendering directly into document.body
 * @param {boolean} isOpen - Trigger show/hide
 * @param {Function} onClose - Close handler
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Body content
 * @param {string} size - size helper: 'sm' (confirm/1-field ~448px), 'md' (standard form ~576px), 'lg' (dossiers/checklists ~768px), 'xl' (tables/quotations ~1024px)
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

  // Specific size variants using sm:max-w-* to preserve fixed container bounds on desktop while allowing mobile responsiveness
  const sizeClasses = {
    sm: 'sm:max-w-md',   // ~448px (Confirmation dialogs, single inputs)
    md: 'sm:max-w-xl',   // ~576px (Standard 2-column forms: Customer Record, Edit User)
    lg: 'sm:max-w-3xl',  // ~768px (Content-heavy forms, dossiers, checklists)
    xl: 'sm:max-w-5xl'   // ~1024px (Table-heavy modals: Commercial Quotation, Purchase Orders)
  }[size] || 'sm:max-w-xl';

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 1. Backdrop Overlay: Fixed inset-0 covers 100% viewport unconditionally */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[3px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* 2. Positioning Container: Center modal vertically & horizontally in viewport with edge padding */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* 3. Modal Dialog Box: Capped at size variant on desktop and max-w-[calc(100vw-2rem)] on mobile */}
        <div 
          className={`pointer-events-auto relative w-full max-w-[calc(100vw-2rem)] ${sizeClasses} max-h-[90vh] flex flex-col transform rounded-2xl border border-border-color bg-bg-modal shadow-modal text-left align-middle transition-all duration-200 animate-fadeIn overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          {/* 4. Integrated Header (Pinned Top) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-bg-modal shrink-0 select-none">
            <h3 className="text-lg font-bold text-text-primary tracking-tight truncate mr-3">
              {title}
            </h3>
            <button
              type="button"
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close modal</span>
              <X size={18} />
            </button>
          </div>

          {/* 5. Scrollable Content Body Area (Internal Scrollbar) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 bg-bg-modal text-text-primary">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render directly into document.body via React Portal to escape parent CSS transform contexts
  return createPortal(modalContent, document.body);
};

export default Modal;
