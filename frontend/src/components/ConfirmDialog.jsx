import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-text-secondary leading-relaxed font-sans">{message}</p>
      <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-border-color">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
