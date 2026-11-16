import { useEffect, useState } from 'react';
import { useSearchQuery } from '@/features/search/queries.js';

/** Pick one lesson by searching its title/content. `value` is `{ id, title }` or null. */
export default function LessonPicker({ value, onChange }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 250); // wait for the typing to pause
    return () => clearTimeout(t);
  }, [text]);
  const { data = [], isFetching } = useSearchQuery(q);

  if (value) {
    return (
      <div className="lp-chosen">
        <span>📖 {value.title}</span>
        <button type="button" className="btn ghost small" onClick={() => onChange(null)}>Bỏ chọn</button>
      </div>
    );
  }

  const pick = (r) => {
    onChange({ id: r.lesson_id, title: r.lesson_title });
    setText('');
    setOpen(false);
  };

  return (
    <div className="lp" style={{ position: 'relative' }}>
      <input value={text} placeholder="Gõ để tìm bài học…" onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && q.length >= 2 && (
        <ul className="lp-pop">
          {isFetching && <li className="lp-none">Đang tìm…</li>}
          {!isFetching && data.length === 0 && <li className="lp-none">Không có bài học phù hợp.</li>}
          {data.map((r) => (
            <li key={r.lesson_id}>
              <button type="button" onClick={() => pick(r)}>
                <span>{r.lesson_title}</span>
                <small>{r.topic_title}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
