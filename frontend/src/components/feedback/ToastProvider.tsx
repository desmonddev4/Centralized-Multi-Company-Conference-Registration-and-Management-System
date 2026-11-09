import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import './ToastProvider.css';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export type ToastInput = { title?: string; message: string; variant?: ToastVariant; duration?: number };
type ToastItem = ToastInput & { id: number; variant: ToastVariant };
type ToastContextValue = { showToast: (toast: ToastInput) => void; dismissToast: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;

export function dispatchToast(toast: ToastInput) {
  window.dispatchEvent(new CustomEvent<ToastInput>('app:toast', { detail: toast }));
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider.');
  return value;
}

export default function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((input: ToastInput) => {
    const item: ToastItem = { ...input, id: ++nextToastId, variant: input.variant || 'info' };
    setToasts((items) => [...items.slice(-3), item]);
    if (item.duration !== 0) window.setTimeout(() => dismissToast(item.id), item.duration ?? 6000);
  }, [dismissToast]);

  useEffect(() => {
    const onToast = (event: Event) => showToast((event as CustomEvent<ToastInput>).detail);
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, [showToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);
  return <ToastContext.Provider value={value}>
    {children}
    <section className="toast-stack" aria-label="Notifications" aria-live="polite" aria-relevant="additions text">
      {toasts.map((toast) => <article className={`app-toast app-toast--${toast.variant}`} key={toast.id} role={toast.variant === 'error' ? 'alert' : 'status'}>
        <span className="app-toast__icon" aria-hidden="true">{toast.variant === 'success' ? '✓' : toast.variant === 'error' ? '!' : toast.variant === 'warning' ? '⚠' : 'i'}</span>
        <div className="app-toast__body">
          {toast.title && <strong className="app-toast__title">{toast.title}</strong>}
          <p>{toast.message}</p>
        </div>
        <button className="app-toast__close" type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>×</button>
      </article>)}
    </section>
  </ToastContext.Provider>;
}
