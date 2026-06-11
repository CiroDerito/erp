import { ButtonHTMLAttributes, ReactNode, useEffect } from 'react';

export function StatCard({ label, value, tone, children }: { label: string; value: string; tone?: 'green' | 'amber' | 'red'; children?: ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `text-${tone}` : ''}`}>{value}</div>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function CurrencyBadge({ children }: { children: ReactNode }) {
  return <span className="currency-badge">{children}</span>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
      </div>
      <div className="toolbar-spacer" />
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'outline' | 'success' }) {
  return (
    <button className={`btn btn-${variant} ${className}`} type={type} {...props}>
      {children}
    </button>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;

    function onCloseWithEscOrClickout(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onCloseWithEscOrClickout);

    return () => {
      window.removeEventListener('keydown', onCloseWithEscOrClickout);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" type="button" onClick={onClose}>x</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function TableState({ loading, error, colSpan }: { loading: boolean; error: string; colSpan: number }) {
  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="table-state">Cargando datos...</td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="table-state error">{error}</td>
      </tr>
    );
  }

  return null;
}

export function EmptyRow({ colSpan, label = 'Sin datos cargados' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="table-state">{label}</td>
    </tr>
  );
}
