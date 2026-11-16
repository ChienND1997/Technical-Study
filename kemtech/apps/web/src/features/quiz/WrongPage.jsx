import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Markdown from '@/shared/components/Markdown.jsx';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useAddToBasket } from '@/features/review/queries.js';
import { useWrongCardsQuery } from './queries.js';
import QuizPage from './QuizPage.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

/** "Sổ câu sai": cards whose latest quiz answer was wrong, with a topic filter and manual add-to-basket. */
export default function WrongPage({ embedded = false }) {
  const [open, setOpen] = useState(() => new Set()); // card ids whose answer is shown
  const [topic, setTopic] = useState('');
  const [added, setAdded] = useState(() => new Set()); // card ids already sent to the basket this visit
  const { data, isLoading, error } = useWrongCardsQuery();
  const basket = useAddToBasket();
  const [retry, setRetry] = useState(false); // true while the retry quiz is shown

  const topics = useMemo(() => {
    const counts = new Map();
    for (const c of data ?? []) counts.set(c.topic_title, (counts.get(c.topic_title) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [data]);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} />;

  if (retry) {
    return (
      <div className="wrong-page">
        <QuizPage wrongOnly wrongCount={data.length} onExit={() => setRetry(false)} />
      </div>
    );
  }

  const list = topic ? data.filter((c) => c.topic_title === topic) : data;
  // Grouped by topic (busiest first, matching the filter chips above) so a long notebook reads as a
  // set of focused sections instead of one interleaved list; a chosen topic is just its own group.
  const groups = topic
    ? [[topic, list]]
    : topics.map(([name]) => [name, list.filter((c) => c.topic_title === name)]);
  const toggle = (id) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  async function addToBasket(ids) {
    await basket.mutateAsync({ cardIds: ids });
    setAdded((s) => new Set([...s, ...ids]));
  }
  const pending = list.filter((c) => !added.has(c.id)).map((c) => c.id);

  return (
    <div className="wrong-page">
      {!embedded && <p><Link to="/practice" search={{ mode: 'quiz' }}>← Trắc nghiệm</Link></p>}
      {!embedded && (
        <PageHero
          tag="Luyện tập"
          title={<>Sổ <em>câu sai</em></>}
          sub="Các câu có lần trả lời gần nhất là sai. Làm đúng một lần thì câu đó rời khỏi sổ."
          icon="📕"
        />
      )}

      {data.length === 0 ? (
        <div className="card wrong-empty"><div className="wrong-ok">🎉</div><b>Chưa có câu sai nào. Tuyệt vời!</b><p className="muted">Làm thêm trắc nghiệm để tiếp tục luyện tập.</p><Link to="/practice" search={{ mode: 'quiz' }} className="btn">Làm trắc nghiệm</Link></div>
      ) : (
        <div className="wrong-body">
          <div className="tiles compact wrong-tiles">
            <div className="tile"><b>📕 {data.length}</b><span className="muted small">câu đang trong sổ</span></div>
            <div className="tile"><b>🗂️ {topics.length}</b><span className="muted small">chủ đề liên quan</span></div>
            <div className="tile"><b>🧺 {added.size}</b><span className="muted small">đã thêm vào giỏ lần này</span></div>
          </div>

          <div className="card wrong-retry">
            <span className="wrong-retry-ic" aria-hidden="true">▶</span>
            <div className="wrong-retry-text">
              <b>Làm lại các câu sai</b>
              <div className="muted small">Trắc nghiệm với đúng {Math.min(data.length, 30)} câu đang nằm trong sổ. Trả lời đúng thì câu rời khỏi sổ.</div>
            </div>
            <button type="button" className="btn" onClick={() => setRetry(true)}>Làm lại ({Math.min(data.length, 30)} câu)</button>
          </div>

          <div className="wrong-bar">
            <div className="chips">
              <button type="button" className={`chip pick ${topic === '' ? 'ok' : ''}`} onClick={() => setTopic('')}>Tất cả · {data.length}</button>
              {topics.map(([name, n]) => (
                <button key={name} type="button" className={`chip pick ${topic === name ? 'ok' : ''}`} onClick={() => setTopic(topic === name ? '' : name)}>{name} · {n}</button>
              ))}
            </div>
            <button type="button" className="btn mint" disabled={basket.isPending || pending.length === 0} onClick={() => addToBasket(pending)}>
              {pending.length === 0 ? '✓ Đã thêm vào giỏ' : `Thêm ${pending.length} câu vào giỏ`}
            </button>
          </div>
          {basket.error && <p className="err small">{basket.error.message}</p>}

          {(() => {
            let n = 0;
            return groups.map(([name, cards]) => cards.length > 0 && (
              <section key={name} className="wrong-group">
                <h3 className="wrong-group-title">{name} <span className="muted small">· {cards.length} câu</span></h3>
                <div className="wrong-list">
                  {cards.map((c) => {
                    n += 1;
                    const shown = open.has(c.id);
                    return (
                      <article key={c.id} className="card wrong-card">
                        <header className="wrong-head">
                          <span className="wrong-no">{n}</span>
                          <span className="muted small wrong-lesson">{c.lesson_title}</span>
                        </header>
                        <div className="wrong-q">
                          <span className="q-label">Câu hỏi</span>
                          <Markdown>{c.front}</Markdown>
                        </div>
                        {shown && (
                          <div className="wrong-a" id={`wrong-answer-${c.id}`}>
                            <span className="a-label">Đáp án</span>
                            <Markdown>{c.back}</Markdown>
                          </div>
                        )}
                        <footer className="wrong-actions">
                          <button type="button" className="btn small" aria-expanded={shown} aria-controls={`wrong-answer-${c.id}`} onClick={() => toggle(c.id)}>{shown ? 'Ẩn đáp án' : 'Xem đáp án'}</button>
                          <button type="button" className="btn ghost small" disabled={basket.isPending || added.has(c.id)} onClick={() => addToBasket([c.id])}>
                            {added.has(c.id) ? '✓ Đã vào giỏ' : '＋ Thêm vào giỏ'}
                          </button>
                          <Link to="/lessons/$lessonId" params={{ lessonId: String(c.lesson_id) }} className="btn ghost small">Mở bài gốc</Link>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </section>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
