import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import Markdown from '@/shared/components/Markdown.jsx';
import TopicIcon from '@/shared/components/TopicIcon.jsx';
import { useSuggestionsQuery } from './queries.js';

/** Curiosity cards: a "did you know?" teaser, weak spots and topics the user has not touched yet. */
export default function Suggestions() {
  const { data, refetch, isFetching } = useSuggestionsQuery();
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const { teaser, weak, fresh, due } = data;

  const topicLink = (t, hint) => (
    <Link key={t.slug} to="/practice" search={{ mode: 'quiz', topic: t.slug }} className="sug-row">
      <TopicIcon slug={t.slug} emoji={t.icon ?? '📘'} size={26} />
      <span><b>{t.title}</b><small>{hint(t)}</small></span>
      <span className="sug-go">›</span>
    </Link>
  );

  return (
    <aside className="suggest">
      <h2 className="sug-title">Gợi ý cho bạn</h2>

      {due > 0 && (
        <Link to="/practice" search={{ mode: 'basket' }} className="sug-due">
          <span>🃏</span>
          <span><b>{due} thẻ chưa học</b><small>Ôn flashcard ngay</small></span>
          <span className="sug-go">›</span>
        </Link>
      )}

      {teaser && (
        <div className="card teaser">
          <div className="row between">
            <span className="chip">💡 Bạn có biết?</span>
            <button className="link-btn" onClick={() => { setOpen(false); refetch(); }} disabled={isFetching}>Câu khác</button>
          </div>
          <p className="teaser-q">{teaser.front}</p>
          {open ? (
            <div className="teaser-a"><Markdown>{teaser.back}</Markdown></div>
          ) : (
            <button className="btn" onClick={() => setOpen(true)}>Xem câu trả lời</button>
          )}
          <div className="muted small" style={{ marginTop: 10 }}>
            {teaser.topic_title} ·{' '}
            <Link to="/lessons/$lessonId" params={{ lessonId: String(teaser.lesson_id) }}>{teaser.lesson_title}</Link>
          </div>
        </div>
      )}

      {weak.length > 0 && (
        <div className="card">
          <b>Nên luyện lại</b>
          <div className="sug-list">{weak.map((t) => topicLink(t, (x) => `Sai ${x.wrong} câu trong 30 ngày qua`))}</div>
        </div>
      )}

      {fresh.length > 0 && (
        <div className="card">
          <b>Chưa khám phá</b>
          <div className="sug-list">{fresh.map((t) => topicLink(t, (x) => `${x.cards} thẻ chưa ôn lần nào`))}</div>
        </div>
      )}
    </aside>
  );
}
