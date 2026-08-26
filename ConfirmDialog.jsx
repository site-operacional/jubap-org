import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ title = 'Confirmar ação', message, confirmLabel = 'Confirmar', danger, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        {danger && <AlertTriangle className="text-berry-500 shrink-0 mt-0.5" size={20} />}
        <p className="text-sm text-forest-700">{message}</p>
      </div>
    </Modal>
  );
}
