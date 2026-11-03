import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div 
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: danger ? 'var(--danger-bg)' : 'var(--warning-bg)',
            color: danger ? 'var(--danger-text)' : 'var(--warning-text)',
            border: `1px solid ${danger ? 'var(--danger-border)' : 'var(--warning-border)'}`
          }}
        >
          {danger ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-border-color">
        <button
          type="button"
          onClick={onClose}
          className="btn"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={danger ? 'btn btn-danger' : 'btn btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
