import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Custom dropdown (the native popup cannot be styled). Closes on outside click and Escape, supports
 * arrow keys + Enter, and an optional search box.
 *
 * options: [{ value, label, icon?, depth?, hint? }]  (depth 1 = indented child)
 */
export default function Select({ value, onChange, options, searchable = false, placeholder = 'Chọn…', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const list = useRef(null);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Start on the selected option and keep it in view when opening.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (shown[active]) pick(shown[active]); }
  };

  return (
    <div className={`sel ${open ? 'open' : ''}`} ref={root} onKeyDown={onKey}>
      <button type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}>
        {current?.icon && <span className="sel-ic">{current.icon}</span>}
        <span className={`sel-label ${current ? '' : 'ph'}`}>{current?.label ?? placeholder}</span>
        <svg className="sel-caret" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="sel-pop">
          {searchable && (
            <input
              className="sel-search" autoFocus type="text" value={q} placeholder="Tìm…" aria-label="Tìm trong danh sách"
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
            />
          )}
          <ul role="listbox" ref={list}>
            {shown.map((o, i) => (
              <li
                key={o.value} role="option" aria-selected={o.value === value} data-active={i === active}
                className={`sel-opt ${o.depth ? 'child' : ''} ${o.value === value ? 'on' : ''} ${i === active ? 'hot' : ''}`}
                onMouseEnter={() => setActive(i)} onClick={() => pick(o)}
              >
                {o.icon && <span className="sel-ic">{o.icon}</span>}
                <span className="sel-text">{o.label}{o.hint && <small>{o.hint}</small>}</span>
                {o.value === value && <span className="sel-check">✓</span>}
              </li>
            ))}
            {shown.length === 0 && <li className="sel-none">Không có kết quả</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
