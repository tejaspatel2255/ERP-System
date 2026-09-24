import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-xs text-text-secondary leading-relaxed font-sans">{message}</p>
      <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border-color">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xs border border-border-color bg-bg-card px-3.5 py-1.5 text-xs font-mono font-bold uppercase text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-xs px-4 py-1.5 text-xs font-mono font-bold uppercase text-white shadow-2xs transition-all ${
            danger
              ? 'bg-accent-danger hover:bg-accent-danger/90'
              : 'bg-accent-primary hover:bg-accent-secondary'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
