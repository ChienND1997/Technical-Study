import { useEffect, useState } from 'react';

const EVENT = 'kt-toast';

/** Shows a short message at the bottom of the screen. Works from anywhere (components or plain modules). */
export function toast(message, { type = 'ok', action } = {}) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: Date.now() + Math.random(), message, type, action } }));
}

/** Renders the toasts; mounted once in the app providers. */
export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const on = (e) => {
      const t = e.detail;
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.action ? 7000 : 3500);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const close = (id) => setItems((list) => list.filter((x) => x.id !== id));
  if (items.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span aria-hidden="true">{t.type === 'error' ? '⚠️' : '✓'}</span>
          <span className="toast-msg">{t.message}</span>
          {t.action && <button type="button" className="toast-act" onClick={() => { t.action.onClick(); close(t.id); }}>{t.action.label}</button>}
          <button type="button" className="toast-x" onClick={() => close(t.id)} aria-label="Đóng">×</button>
        </div>
      ))}
    </div>
  );
}
