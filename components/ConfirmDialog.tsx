'use client';

import { Modal } from '@/components/Modal';
import { useStrings } from '@/store/useSettings';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** O que a pessoa perde ao confirmar — o motivo de existir o dialogo. */
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const strings = useStrings();

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-4 text-sm">
        <p className="muted">{message}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onCancel} autoFocus>
            {strings.cancel}
          </button>
          <button
            type="button"
            className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
