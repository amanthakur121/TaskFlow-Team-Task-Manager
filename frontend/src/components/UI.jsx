import { X } from 'lucide-react';

export function Avatar({ name = '', color = '#6366f1', size = 'default' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar';
  return <div className={cls} style={{ background: color }}>{initials || '?'}</div>;
}

export function StatusBadge({ status }) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  const icons = { low: '↓', medium: '→', high: '↑', critical: '⚡' };
  return <span className={`badge badge-${priority}`}>{icons[priority]} {priority}</span>;
}

export function Modal({ title, onClose, children, footer, size = '' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="loading-center"><div className="spinner"/></div>;
}

export const PROJECT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316'];

export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {PROJECT_COLORS.map(c => (
        <div key={c} className={`color-swatch ${value === c ? 'selected' : ''}`}
          style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}
