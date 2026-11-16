import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Bar from '@/shared/components/Bar.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { LEVELS } from '@/shared/lib/format.js';
import { useTrackDayQuery, useTrackQuery } from './queries.js';

/** Card for one day, shown right under the phase that was clicked: the day title and the lessons to study. */
function DayCard({ trackId, dayNo, onClose }) {
  const { data, isLoading, error } = useTrackDayQuery(trackId, dayNo);
  const ref = useRef(null);
  // bring the card into view as soon as it appears
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [dayNo, data?.day_no]);

  return (
    <div className="card day-card" ref={ref}>
      {isLoading && <Spinner />}
      {error && <p className="err small">{error.message}</p>}
      {data && (
        <>
          <div className="row between">
            <h3 style={{ margin: 0 }}>Ngày {data.day_no}: {data.title}</h3>
            <div className="row" style={{ gap: 8 }}>
              <span className="tag">{data.done}/{data.total} phiên · ~{data.minutes} phút</span>
              <button type="button" className="lb-toggle" onClick={onClose} aria-label="Đóng" title="Đóng" style={{ display: 'inline-block' }}>×</button>
            </div>
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>Các bài cần học trong ngày này:</p>
          {data.items.length === 0 && <p className="muted small">Ngày này chưa có bài học.</p>}
          {data.items.map((it) => {
            const done = it.sections.filter((s) => s.done).length;
            const first = it.sections.find((s) => !s.done) ?? it.sections[0];
            return (
              <div key={it.item_ord} className="day-lesson">
                <div className="row between">
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Link to="/lessons/$lessonId" params={{ lessonId: String(it.lesson_id) }} search={{ s: first?.ord }}><b>{it.lesson_title}</b></Link>
                    <span className="muted small">{it.topic_title}</span>
                    {it.level && <span className={`tag l${it.level}`}>{LEVELS[it.level]}</span>}
                  </div>
                  <span className="muted small">{done}/{it.sections.length}</span>
                </div>
                <ul className="day-sections">
                  {it.sections.map((s) => (
                    <li key={s.id} className={s.done ? 'done' : ''}>
                      <span className={`ck ${s.done ? 'on' : ''}`}>{s.done ? '✓' : '○'}</span>
                      <Link to="/lessons/$lessonId" params={{ lessonId: String(it.lesson_id) }} search={{ s: s.ord }}>{s.heading}</Link>
                      <span className="muted small">{s.minutes}′</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function TrackDetailPage() {
  const { trackId } = useParams({ strict: false });
  const [sel, setSel] = useState(null);
  const { data, isLoading, error } = useTrackQuery(trackId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { track, days, phases = [] } = data;
  const doneDays = days.filter((d) => d.total > 0 && d.done >= d.total).length;
  const current = days.find((d) => d.total > 0 && d.done < d.total)?.day_no;

  return (
    <div>
      <p><Link to="/tracks">← Các lộ trình</Link></p>
      <h1>{track.title}</h1>
      <p className="muted">{track.description}</p>
      <Bar value={doneDays} max={days.length} label="Tiến độ" />
      <p className="small muted">Đã xong {doneDays}/{days.length} ngày · ngày hiện tại: {current ?? '—'} · bấm một ngày để xem các bài cần học</p>

      {phases.map((ph) => (
        <section key={ph.no} className={`phase ${ph.status}`}>
          <div className="phase-head">
            <span className="phase-no">{ph.status === 'done' ? '✓' : ph.no}</span>
            <div className="phase-title">
              <b>Giai đoạn {ph.no}: {ph.title}</b>
              <span className="muted small">Ngày {ph.day_from}–{ph.day_to} · xong {ph.days_done}/{ph.days} ngày</span>
            </div>
            <span className={`chip ${ph.status === 'done' ? 'ok' : ''}`}>{{ done: 'Hoàn thành', current: 'Đang học', todo: 'Sắp tới' }[ph.status]}</span>
          </div>
          <div className="daylist">
            {days.filter((d) => d.day_no >= ph.day_from && d.day_no <= ph.day_to).map((d) => {
              const full = d.total > 0 && d.done >= d.total;
              const part = !full && d.done > 0;
              return (
                <button
                  key={d.id}
                  className={`daydot ${full ? 'done' : part ? 'part' : ''} ${sel === d.day_no ? 'active' : ''}`}
                  onClick={() => setSel(sel === d.day_no ? null : d.day_no)}
                  title={`Ngày ${d.day_no}: ${d.title}`}
                  aria-expanded={sel === d.day_no}
                >
                  {d.day_no}
                </button>
              );
            })}
          </div>
          {sel !== null && sel >= ph.day_from && sel <= ph.day_to && <DayCard trackId={trackId} dayNo={sel} onClose={() => setSel(null)} />}
        </section>
      ))}
    </div>
  );
}
