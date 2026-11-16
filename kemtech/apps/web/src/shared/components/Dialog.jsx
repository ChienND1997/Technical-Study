import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '@/shared/lib/useFocusTrap.js';

const DialogContext = createContext(null);

/** The modal itself: a confirmation (no `field`) or a one-line prompt (`field` set). */
function DialogBox({ opts, onDone }) {
  const boxRef = useRef(null);
  const [value, setValue] = useState(opts.defaultValue ?? '');
  useFocusTrap(boxRef);
  const isPrompt = opts.kind === 'prompt';
  const tooShort = isPrompt && value.trim().length < (opts.minLength ?? 1);

  const submit = (e) => {
    e.preventDefault();
    if (!tooShort) onDone(isPrompt ? value.trim() : true);
  };

  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && onDone(isPrompt ? null : false)}>
      <form ref={boxRef} className="dlg" role="dialog" aria-modal="true" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onDone(isPrompt ? null : false)}>
        <span className="dlg-ic" aria-hidden="true">{opts.icon ?? (opts.danger ? '⚠️' : isPrompt ? '✏️' : '❓')}</span>
        {opts.title && <h3>{opts.title}</h3>}
        {opts.message && <p className="dlg-msg">{opts.message}</p>}
        {isPrompt && (
          <label className="dlg-field">
            {opts.label && <span>{opts.label}</span>}
            <input type={opts.type ?? 'text'} value={value} minLength={opts.minLength} onChange={(e) => setValue(e.target.value)} />
          </label>
        )}
        <div className="dlg-actions">
          {!opts.noCancel && <button type="button" className="btn ghost" onClick={() => onDone(isPrompt ? null : false)}>{opts.cancelText ?? 'Hủy'}</button>}
          <button type="submit" className={`btn ${opts.danger ? 'dlg-danger' : ''}`} disabled={tooShort}>{opts.confirmText ?? 'Đồng ý'}</button>
        </div>
      </form>
    </div>
  );
}

/** Mounts once near the root and renders the dialog that `useDialog()` asked for. */
export function DialogProvider({ children }) {
  const [current, setCurrent] = useState(null); // { opts, resolve }

  const open = useCallback(
    (opts) => new Promise((resolve) => setCurrent({ opts, resolve })),
    [],
  );
  const api = useMemo(
    () => ({
      confirm: (opts) => open({ ...opts, kind: 'confirm' }),
      prompt: (opts) => open({ ...opts, kind: 'prompt' }),
      alert: (opts) => open({ ...opts, kind: 'confirm', noCancel: true, confirmText: opts.confirmText ?? 'Đã hiểu' }),
    }),
    [open],
  );
  const done = (result) => {
    current?.resolve(result);
    setCurrent(null);
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogBox opts={current.opts} onDone={done} />}
    </DialogContext.Provider>
  );
}

/** `await dlg.confirm({ message, confirmText, danger })` -> boolean; `await dlg.prompt({ label, type, minLength })` -> string | null. */
export function useDialog() {
  return useContext(DialogContext);
}
