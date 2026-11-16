import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { loadPref, savePref } from '@/shared/lib/preferences.js';
import Markdown from '@/shared/components/Markdown.jsx';
import { todayKeys } from '@/features/today/queries.js';
import { answerCard, fetchReviewQueue } from './api.js';
import Spinner from '@/shared/components/Spinner.jsx';

const RATINGS = [
  { r: 1, label: 'Học lại', key: '1' },
  { r: 2, label: 'Khó', key: '2' },
  { r: 3, label: 'Tốt', key: '3' },
  { r: 4, label: 'Dễ', key: '4' },
];

/**
 * Review session: loads up to 20 due cards. Rating a card "again" (rating 1) puts the card back in the queue
 * after a few other cards (the server returns requeueAfter); the other ratings are scheduled server-side.
 */
export default function ReviewPage() {
  const { topic } = useSearch({ strict: false });
  const qc = useQueryClient();
  const [queue, setQueue] = useState(null);
  const [total, setTotal] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [reversed, setReversed] = useState(() => loadPref('reversed', false)); // false: question -> answer, true: answer -> question
  const [stats, setStats] = useState({ done: 0, again: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const shownAt = useRef(Date.now());

  const load = useCallback(async () => {
    const q = await fetchReviewQueue({ limit: 20, topic });
    setQueue(q.cards);
    setTotal(q.total);
    setReveal(false);
    shownAt.current = Date.now();
  }, [topic]);

  useEffect(() => {
    load().catch(() => setQueue([]));
  }, [load]);

  const card = queue?.[0];

  const answer = useCallback(
    async (rating) => {
      if (!card || busy) return;
      setBusy(true);
      setErr(null);
      try {
        const res = await answerCard({
          cardId: card.id,
          rating,
          direction: reversed ? 'aq' : 'qa',
          durationMs: Math.min(Date.now() - shownAt.current, 3_600_000),
        });
        setStats((s) => ({ done: s.done + 1, again: s.again + (rating === 1 ? 1 : 0) }));
        const rest = queue.slice(1);
        if (res.requeueAfter != null) {
          // "again": reinsert after N other cards (or at the end if there are fewer)
          rest.splice(Math.min(res.requeueAfter, rest.length), 0, { ...card, state: 'learning', preview: card.preview });
        }
        setQueue(rest);
        setReveal(false);
        shownAt.current = Date.now();
        if (rest.length === 0) {
          qc.invalidateQueries({ queryKey: todayKeys.all });
          load(); // more cards may be due right after answering
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    },
    [card, busy, queue, reversed, qc, load],
  );

  // Keyboard shortcuts: Space/Enter reveals the card, 1-4 rates it
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      // Space/Enter on a button or link keeps its default behavior (keyboard accessibility)
      if (['BUTTON', 'A'].includes(tag) && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setReveal(true);
      } else if (reveal && ['1', '2', '3', '4'].includes(e.key)) {
        answer(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reveal, answer]);

  const toggleDir = () => {
    setReversed((v) => {
      savePref('reversed', !v);
      return !v;
    });
    setReveal(false);
  };

  if (queue === null) return <Spinner />;

  if (!card) {
    return (
      <div className="card">
        <h2>{stats.done > 0 ? `Xong! Bạn đã ôn ${stats.done} thẻ` : 'Không có thẻ nào đến hạn'}</h2>
        {stats.done > 0 && <p className="muted">{stats.again} thẻ cần học lại. Các thẻ còn lại đã được hẹn lịch.</p>}
        <p className="muted">
          Thêm thẻ vào giỏ từ trang bài học ("Thêm thẻ vào giỏ"), hoặc làm trắc nghiệm: câu sai sẽ tự vào giỏ.
        </p>
        <div className="row">
          <Link to="/" className="btn">Về Hôm nay</Link>
          <Link to="/topics" className="btn ghost">Chọn bài để thêm thẻ</Link>
          <Link to="/practice" search={{ mode: 'quiz' }} className="btn ghost">Làm trắc nghiệm</Link>
        </div>
      </div>
    );
  }

  const front = reversed ? card.back : card.front;
  const back = reversed ? card.front : card.back;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Ôn tập</h1>
        <div className="row">
          <span className="muted small">Còn {queue.length} trong phiên · {total} đến hạn</span>
          <button className="btn ghost" onClick={toggleDir} title="Đổi chiều hỏi/đáp">
            {reversed ? 'Đáp → Hỏi' : 'Hỏi → Đáp'}
          </button>
        </div>
      </div>

      <div className="card flash" style={{ marginTop: 14 }} onClick={() => setReveal(true)}>
        <div className="muted small">
          {card.topic_title} · {card.lesson_title} · {card.kind === 'qa' ? 'Hỏi đáp' : card.kind === 'followup' ? 'Hỏi xoáy' : card.kind === 'core' ? 'Cốt lõi' : 'Tóm tắt'}
          {card.state !== 'new' ? '' : ' · thẻ mới'}
        </div>
        <div className="q"><Markdown>{front}</Markdown></div>
        {reveal ? (
          <div className="a">
            <Markdown>{back}</Markdown>
            {card.extra?.nho && !reversed && (
              <p className="small muted"><b>Nhớ:</b></p>
            )}
            {card.extra?.nho && !reversed && <Markdown className="small">{card.extra.nho}</Markdown>}
            <Link to="/lessons/$lessonId" params={{ lessonId: String(card.lesson_id) }} className="small" onClick={(e) => e.stopPropagation()}>
              Mở bài gốc
            </Link>
          </div>
        ) : (
          <span className="muted small">Nhẩm câu trả lời trong đầu, rồi bấm để xem (Space).</span>
        )}
      </div>

      {err && <p className="err">Không lưu được kết quả: {err}. Bấm lại để thử lần nữa.</p>}
      {reveal ? (
        <div className="rate">
          {RATINGS.map((x) => (
            <button key={x.r} disabled={busy} onClick={() => answer(x.r)}>
              <b>{x.label}</b> <span className="muted small">({x.key})</span>
              <small>{card.preview?.[x.r]}</small>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button className="btn" onClick={() => setReveal(true)}>Hiện đáp án</button>
        </div>
      )}
    </div>
  );
}
