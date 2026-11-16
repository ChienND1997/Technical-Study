import { Link, useSearch } from '@tanstack/react-router';
import { LEVELS } from '@/shared/lib/format.js';
import { useSearchQuery } from './queries.js';

export default function SearchPage() {
  const { q } = useSearch({ strict: false });
  const { data, isLoading, error } = useSearchQuery(q);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1>Tìm kiếm: "{q}"</h1>
      <p className="muted small">Tìm không dấu, khớp mọi từ. Ví dụ: <code>dong bo hoa</code> tìm được "đồng bộ hóa".</p>
      {isLoading && <p className="muted">Đang tìm…</p>}
      {error && <p className="err">{error.message}</p>}
      {data && data.length === 0 && <div className="card">Không có kết quả.</div>}
      {data?.map((r) => (
        <div key={r.lesson_id} className="card">
          <div className="row" style={{ gap: 8 }}>
            <Link to="/lessons/$lessonId" params={{ lessonId: String(r.lesson_id) }} search={{ s: r.ord }}><b>{r.lesson_title}</b></Link>
            {r.level && <span className={`tag l${r.level}`}>{LEVELS[r.level]}</span>}
            <span className="muted small">{r.topic_title}</span>
          </div>
          <div className="small"><b>{r.heading}</b></div>
          <div className="muted small">{r.snippet}…</div>
        </div>
      ))}
    </div>
  );
}
