import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LEVELS } from '@/shared/lib/format.js';

/**
 * One lesson with its sessions, read-only (sessions are ticked on the lesson page, in order).
 * Clicking the header folds or unfolds the card; the title link still opens the lesson.
 */
export default function LessonBlock({ g, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const done = g.sections.filter((s) => s.done).length;
  return (
    <div className={`lesson-block l${g.level ?? 0} ${open ? '' : 'collapsed'}`}>
      <div
        className="lb-head clickable" role="button" tabIndex={0} aria-expanded={open} title={open ? 'Bấm để thu gọn' : 'Bấm để mở rộng'}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((v) => !v))}
      >
        <div>
          <Link to="/lessons/$lessonId" params={{ lessonId: String(g.lesson_id) }} className="lb-title" onClick={(e) => e.stopPropagation()}>{g.lesson_title}</Link>
          <div className="muted small">{g.topic_title}</div>
        </div>
        <div className="lb-meta">
          {g.level && <span className={`tag l${g.level}`}>{LEVELS[g.level]}</span>}
          {!open && <span className="tag">{done}/{g.sections.length}</span>}
          <span className="tag">~{g.minutes} phút</span>
        </div>
      </div>
      {open && (
        <ul className="lb-list">
          {g.sections.map((s) => (
            <li key={s.id} className={s.done ? 'done' : ''}>
              {s.done && <span className="tick" aria-hidden="true">✓</span>}
              <Link to="/lessons/$lessonId" params={{ lessonId: String(g.lesson_id) }} search={{ s: s.ord }}>{s.heading}</Link>
              <span className="lb-min">{s.minutes}′</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
