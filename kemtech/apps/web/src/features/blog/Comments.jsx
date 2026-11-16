import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMeQuery } from '@/features/auth/queries.js';
import { levelIcon } from '@/shared/lib/levels.js';
import MentionTextarea from '@/shared/components/MentionTextarea.jsx';
import { withMentions } from '@/shared/lib/mentions.jsx';
import { QUOTE_EVENT } from './QuoteSelector.jsx';
import { useAddComment, useCommentsQuery, useDeleteComment } from './queries.js';
import { useDialog } from '@/shared/components/Dialog.jsx';

/** Blue check-in-circle, like a verified badge. */
const VerifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 1.8l2.4 1.7 2.9-.2 1.2 2.7 2.6 1.3-.3 2.9L22.4 12l-1.6 2.4.3 2.9-2.6 1.3-1.2 2.7-2.9-.2L12 22.8l-2.4-1.7-2.9.2-1.2-2.7-2.6-1.3.3-2.9L1.6 12l1.6-2.4-.3-2.9 2.6-1.3 1.2-2.7 2.9.2L12 1.8z" />
    <path d="M7.8 12.2l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Renders a comment: lines starting with "> " become a quote block, the rest keeps its @mentions. */
function renderBody(body, mentions = []) {
  const blocks = [];
  for (const line of body.split('\n')) {
    const isQuote = line.startsWith('> ');
    const text = isQuote ? line.slice(2) : line;
    const last = blocks.at(-1);
    if (last && last.quote === isQuote) last.lines.push(text);
    else blocks.push({ quote: isQuote, lines: [text] });
  }
  return blocks.map((b, i) =>
    b.quote ? (
      <blockquote key={i} className="comment-quote">{b.lines.join(' ')}</blockquote>
    ) : (
      <span key={i} className="comment-text">{withMentions(b.lines.join('\n').trim(), mentions)}</span>
    ),
  );
}

const when = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Comment thread under a blog post. `type` is 'post' or 'lesson'; anyone signed in can comment. */
const BLOCKED_HINT = 'Tài khoản này đã bị khóa hoặc không còn tồn tại';

export default function Comments({ type, id }) {
  const dlg = useDialog();
  const me = useMeQuery().data?.user;
  const { data = [], isLoading } = useCommentsQuery(type, id);
  const add = useAddComment();
  const del = useDeleteComment();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]); // users chosen from the @ autocomplete
  const box = useRef(null);

  // "Trích dẫn" from the article: put the selected text at the top of the comment as a quote block
  useEffect(() => {
    const onQuote = (e) => {
      const q = `> ${e.detail.text}\n\n`;
      setText((t) => (q + t).slice(0, 1000));
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      box.current?.focus({ preventScroll: true });
    };
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const mentionIds = picked.filter((u) => text.includes(`@${u.name}`)).map((u) => u.id);
    await add.mutateAsync({ type, id: Number(id), body: text.trim(), mentionIds });
    setText('');
    setPicked([]);
  }

  return (
    <section className="comments card">
      <h3 style={{ margin: 0 }}>Bình luận {data.length > 0 && <span className="tab-n">{data.length}</span>}</h3>
      <form className="comment-form" onSubmit={submit}>
        <MentionTextarea
          ref={box}
          value={text}
          onChange={setText}
          onPick={(u) => setPicked((p) => (p.some((x) => x.id === u.id) ? p : [...p, u]))}
          maxLength={1000}
          rows={3}
          placeholder="Chia sẻ suy nghĩ của bạn… Gõ @ để nhắc đến một người dùng, hoặc bôi đen đoạn văn trong bài để trích dẫn."
        />
        <div className="row between">
          <span className="muted small">{text.length}/1000</span>
          <button className="btn" type="submit" disabled={add.isPending || !text.trim()}>{add.isPending ? 'Đang gửi…' : 'Gửi bình luận'}</button>
        </div>
        {add.error && <p className="err small">{add.error.message}</p>}
      </form>

      {isLoading && <p className="muted small">Đang tải bình luận…</p>}
      {!isLoading && data.length === 0 && <p className="muted small">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}
      <ul className="comment-list">
        {data.map((c) => (
          <li key={c.id} className="comment">
            <Link to="/users/$userId" params={{ userId: String(c.user_id) }} className={`comment-av ${c.author_blocked ? 'blocked' : ''}`}>
              {c.avatar_url ? <img src={c.avatar_url} alt="" referrerPolicy="no-referrer" /> : (c.author || '?').slice(0, 1).toUpperCase()}
            </Link>
            <div className="comment-main">
              <div className="comment-bubble">
                <div className="row" style={{ gap: 6 }}>
                  <Link to="/users/$userId" params={{ userId: String(c.user_id) }} className="comment-author-link"><b>{c.author}</b></Link>
                  {c.author_level > 0 && <span className="level-chip" title={`Cấp ${c.author_level}`}>{levelIcon(c.author_level)}</span>}
                  {c.author_blocked && <span className="blocked-badge" title={BLOCKED_HINT}>🚫 Đã khóa</span>}
                  {c.is_admin && <span className="vbadge admin" title="Quản trị viên"><VerifiedIcon /> Admin</span>}
                  {c.is_author && <span className="vbadge author" title="Tác giả bài viết"><VerifiedIcon /> Tác giả</span>}
                </div>
                <div className="comment-body">{renderBody(c.body, c.mentions)}</div>
              </div>
              <div className="comment-meta row">
                <span className="muted small">{when(c.created_at)}</span>
                {(c.user_id === me?.id || me?.isAdmin) && (
                  <button className="link-btn danger" onClick={async () => (await dlg.confirm({ message: 'Xóa bình luận này?', confirmText: 'Xóa', danger: true })) && del.mutate(c.id)}>Xóa</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
