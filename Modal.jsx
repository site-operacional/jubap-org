import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-card ${wide ? 'max-w-2xl' : ''}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-100">
          <h3 className="font-display text-lg text-forest-900">{title}</h3>
          <button onClick={onClose} className="text-forest-400 hover:text-forest-700 p-1 rounded-md hover:bg-forest-50">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-forest-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
