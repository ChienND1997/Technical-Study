import { useEffect, useRef, useState } from 'react';

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth(), t.getDate());
};
const parse = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};
const show = (iso) => {
  const p = parse(iso);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : '';
};

/** Calendar popup (weeks start on Monday). `value`/`min` are 'YYYY-MM-DD'; `onChange` gets the same format or ''. */
export default function DatePicker({ value, onChange, min, placeholder = 'Chọn ngày' }) {
  const [open, setOpen] = useState(false);
  const start = parse(value) ?? parse(min) ?? parse(todayIso());
  const [view, setView] = useState({ y: start.y, m: start.m });
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const s = parse(value) ?? parse(min) ?? parse(todayIso());
      setView({ y: s.y, m: s.m });
    }
    setOpen((o) => !o);
  };
  const shift = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = todayIso();

  return (
    <div className={`dp ${open ? 'open' : ''}`} ref={root}>
      <button type="button" className="dp-btn" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        {value ? <span>{show(value)}</span> : <span className="ph">{placeholder}</span>}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </svg>
      </button>
      {open && (
        <div className="dp-pop" role="dialog" aria-label="Chọn ngày">
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => shift(-1)} aria-label="Tháng trước">‹</button>
            <b>Tháng {view.m + 1}, {view.y}</b>
            <button type="button" className="dp-nav" onClick={() => shift(1)} aria-label="Tháng sau">›</button>
          </div>
          <div className="dp-grid dp-week">
            {WEEK.map((w, i) => <span key={w} className={i >= 5 ? 'we' : ''}>{w}</span>)}
          </div>
          <div className="dp-grid">
            {cells.map((d, i) => {
              if (d == null) return <span key={`b${i}`} />;
              const iso = toIso(view.y, view.m, d);
              const we = (lead + d - 1) % 7 >= 5;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`dp-day ${we ? 'we' : ''} ${iso === today ? 'today' : ''} ${iso === value ? 'on' : ''}`}
                  disabled={!!min && iso < min}
                  onClick={() => pick(iso)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="dp-foot">
            <button type="button" className="link-btn" onClick={() => pick('')}>Xóa</button>
            <button type="button" className="link-btn" disabled={!!min && today < min} onClick={() => pick(today)}>Hôm nay</button>
          </div>
        </div>
      )}
    </div>
  );
}
