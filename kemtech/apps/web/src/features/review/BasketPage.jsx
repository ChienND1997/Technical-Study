import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import Markdown from '@/shared/components/Markdown.jsx';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import TopicSelect from '@/shared/components/TopicSelect.jsx';
import { LEVELS } from '@/shared/lib/format.js';
import { useBasketQuery, useRemoveFromBasket } from './queries.js';

const STATUSES = [
  { key: 'all', label: 'Tất cả', count: 'total' },
  { key: 'new', label: 'Chưa đọc', count: 'new' },
  { key: 'due', label: 'Đến hạn ôn', count: 'due' },
  { key: 'learning', label: 'Đang học', count: 'learning' },
  { key: 'strong', label: 'Đã vững', count: 'strong' },
];

/** Human-readable due text, e.g. "đến hạn", "sau 3 ngày". */
function dueText(c) {
  if (c.state === 'new') return 'Chưa học lần nào';
  const ms = new Date(c.due_at) - Date.now();
  if (ms <= 0) return 'Đến hạn ôn';
  const min = Math.round(ms / 60000);
  if (min < 60) return `Sau ${min} phút`;
  if (min < 1440) return `Sau ${Math.round(min / 60)} giờ`;
  return `Sau ${Math.round(min / 1440)} ngày`;
}

const STATE_LABEL = { new: 'Chưa đọc', learning: 'Đang học', review: 'Ôn tập' };

function BasketCard({ c, onRemove, removing }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card basket-card ${c.state === 'new' ? 'unread' : ''}`}>
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          <span className={`state-chip s-${c.state}`}>{STATE_LABEL[c.state] ?? c.state}</span>
          {c.level && <span className={`tag l${c.level}`}>{LEVELS[c.level]}</span>}
          <span className="muted small">{c.topic_title}</span>
        </div>
        <span className={`small ${c.is_due ? 'due-now' : 'muted'}`}>{dueText(c)}</span>
      </div>
      <div className="basket-q"><Markdown>{c.front}</Markdown></div>
      {open && <div className="basket-a"><Markdown>{c.back}</Markdown></div>}
      <div className="row between" style={{ marginTop: 8 }}>
        <Link to="/lessons/$lessonId" params={{ lessonId: String(c.lesson_id) }} className="small">{c.lesson_title}</Link>
        <div className="row" style={{ gap: 6 }}>
          <button className="link-btn" onClick={() => setOpen((v) => !v)}>{open ? 'Ẩn đáp án' : 'Xem đáp án'}</button>
          <button className="link-btn danger" disabled={removing} onClick={() => onRemove(c.id)}>Bỏ khỏi giỏ</button>
        </div>
      </div>
    </div>
  );
}

export default function BasketPage({ embedded = false }) {
  const [status, setStatus] = useState('all');
  const [topic, setTopic] = useState('');
  const q = useBasketQuery({ status, topic });
  const remove = useRemoveFromBasket();

  const counts = q.data?.pages[0]?.counts;
  const cards = q.data?.pages.flatMap((p) => p.cards) ?? [];

  return (
    <div className="basket-page">
      {!embedded && (
        <PageHero
          tag="Thẻ của bạn"
          title={<>Giỏ <em>bài</em></>}
          sub="Tất cả thẻ bạn đã thêm để ôn lặp lại. Thẻ chưa đọc là thẻ chưa học lần nào."
          icon="🧺"
        />
      )}

      <div className="basket-bar">
        <div className="tabs cats" role="tablist" style={{ margin: 0 }}>
          {STATUSES.map((s) => (
            <button key={s.key} role="tab" aria-selected={status === s.key} className={`tab ${status === s.key ? 'on' : ''}`} onClick={() => setStatus(s.key)}>
              {s.label} <span className="tab-n">{counts?.[s.count] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="basket-topic"><TopicSelect value={topic} onChange={setTopic} /></div>
      </div>

      {q.isLoading && <Spinner />}
      {q.error && <p className="err">Không tải được giỏ bài. Hãy khởi động lại API rồi tải lại trang.</p>}
      {!q.isLoading && !q.error && cards.length === 0 && (
        <div className="card empty-plan">
          <span className="empty-ic">🧺</span>
          <h3>Giỏ trống</h3>
          <p className="muted">Giỏ chỉ chứa những bài bạn tự thêm: mở một bài học và bấm "Thêm bài vào giỏ", hoặc thêm các câu sai sau khi luyện tập.</p>
          <Link to="/topics" className="btn">Chọn bài học</Link>
        </div>
      )}
      <div className="basket-list">
        {cards.map((c) => <BasketCard key={c.id} c={c} removing={remove.isPending} onRemove={(id) => remove.mutate([id])} />)}
      </div>
      {q.hasNextPage && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn ghost" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}</button>
        </div>
      )}
    </div>
  );
}