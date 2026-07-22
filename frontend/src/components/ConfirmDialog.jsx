import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border-color">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border-color px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all ${
            danger
              ? 'bg-accent-danger hover:opacity-90'
              : 'bg-accent-primary hover:opacity-90'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
