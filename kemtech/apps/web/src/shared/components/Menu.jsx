import { useEffect, useRef, useState } from 'react';

/**
 * Dropdown that closes on outside click, Escape, or when any item inside is activated.
 * `trigger` receives `{ open }` so the caller can style the open state.
 */
export default function Menu({ trigger, align = 'left', className = '', label, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${open ? 'open' : ''} ${className}`} ref={root}>
      <button type="button" className="menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {trigger({ open })}
      </button>
      {open && (
        <div
          className={`menu-pop ${align === 'right' ? 'right' : ''}`}
          role="menu"
          onClick={(e) => e.target.closest('a, button.menu-item') && setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}