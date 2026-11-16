import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Icon from '@/shared/components/Icon.jsx';
import { LEVELS } from '@/shared/lib/format.js';
import { useFocusTrap } from '@/shared/lib/useFocusTrap.js';
import { useSearchQuery } from './queries.js';

/** Ctrl/Cmd+K toggles the palette. `setOpen` is the state setter of the layout. */
export function useSearchShortcut(setOpen) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}

/** Topbar button that opens the palette. */
export function SearchButton({ onOpen }) {
  return (
    <button type="button" className="icon-btn" onClick={onOpen} aria-label="Tìm kiếm (Ctrl+K)" title="Tìm kiếm (Ctrl+K)">
      <Icon name="search" />
    </button>
  );
}

/** Command palette: type to find lessons (accent-insensitive), Enter opens the highlighted one or the full results page. */
export default function SearchPalette({ open, onClose }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }) {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useFocusTrap(boxRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 200); // wait for the typing to pause
    return () => clearTimeout(t);
  }, [text]);

  const { data = [], isFetching } = useSearchQuery(q);
  const results = q.length >= 2 ? data.slice(0, 8) : [];
  const total = results.length + (q.length >= 2 ? 1 : 0); // last row = "see all results"

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = (i) => {
    if (i < results.length) {
      const r = results[i];
      navigate({ to: '/lessons/$lessonId', params: { lessonId: String(r.lesson_id) }, search: { s: r.ord } });
    } else if (text.trim().length >= 1) {
      navigate({ to: '/search', search: { q: text.trim() } });
    } else {
      return;
    }
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown' && total) {
      e.preventDefault();
      setActive((a) => (a + 1) % total);
    } else if (e.key === 'ArrowUp' && total) {
      e.preventDefault();
      setActive((a) => (a - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // before the debounce settles, Enter goes straight to the full results page
      go(q === text.trim() ? active : results.length);
    }
  };

  return (
    <div className="sp-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp" ref={boxRef} role="dialog" aria-modal="true" aria-label="Tìm kiếm" onKeyDown={onKeyDown}>
        <div className="sp-input">
          <Icon name="search" />
          <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tìm bài học, ví dụ: dong bo hoa" aria-label="Từ khóa" />
          <kbd>Esc</kbd>
        </div>
        {q.length < 2 ? (
          <div className="sp-hint">Nhập ít nhất 2 ký tự. Tìm không dấu, khớp mọi từ.</div>
        ) : (
          <ul className="sp-list">
            {isFetching && results.length === 0 && <li className="sp-hint">Đang tìm…</li>}
            {!isFetching && results.length === 0 && <li className="sp-hint">Không có bài nào khớp.</li>}
            {results.map((r, i) => (
              <li key={`${r.lesson_id}-${r.ord}`}>
                <button type="button" className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(i)}>
                  <span className="sp-title">
                    <b>{r.lesson_title}</b>
                    {r.level && <span className={`tag l${r.level}`}>{LEVELS[r.level]}</span>}
                  </span>
                  <span className="sp-meta small">{r.topic_title}{r.heading ? ` · ${r.heading}` : ''}</span>
                  {r.snippet && <span className="sp-snip">{r.snippet}…</span>}
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={active === results.length ? 'on' : ''} onMouseEnter={() => setActive(results.length)} onClick={() => go(results.length)}>
                <span className="sp-title"><b>Xem tất cả kết quả cho "{q}"</b></span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
