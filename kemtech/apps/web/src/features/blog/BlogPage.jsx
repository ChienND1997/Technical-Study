import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import Icon from '@/shared/components/Icon.jsx';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useTopicQuery } from '@/features/topics/queries.js';
import { CATEGORIES, catByKey, categoryOf } from './categories.js';
import { useMeQuery } from '@/features/auth/queries.js';
import { useDeletePost, usePostsQuery } from './queries.js';

/** Blog feed: curated posts (the "blog" topic) plus approved community posts, filtered by category. */
export default function BlogPage() {
  const curated = useTopicQuery('blog');
  const community = usePostsQuery();
  const isAdmin = !!useMeQuery().data?.user?.isAdmin;
  const del = useDeletePost();
  const [cat, setCat] = useState('all');

  const posts = useMemo(() => {
    const a = (curated.data?.lessons ?? []).map((l) => ({
      kind: 'curated', key: `c${l.id}`, id: l.id, title: l.title, minutes: l.minutes, cat: categoryOf(l.path),
      summary: Array.isArray(l.summary) ? l.summary.join(' ') : l.summary,
      done: l.sections > 0 && l.done >= l.sections,
    }));
    const b = (community.data ?? []).map((p) => ({
      kind: 'user', key: `u${p.id}`, id: p.id, title: p.title, minutes: p.minutes, cat: catByKey(p.category) ?? catByKey('other'),
      summary: p.summary, author: p.author,
    }));
    return [...b, ...a];
  }, [curated.data, community.data]);

  const counts = useMemo(() => {
    const m = new Map();
    for (const p of posts) m.set(p.cat?.key, (m.get(p.cat?.key) ?? 0) + 1);
    return m;
  }, [posts]);
  const shown = cat === 'all' ? posts : posts.filter((p) => p.cat?.key === cat);

  if (curated.isLoading || community.isLoading) return <Spinner />;

  return (
    <div>
      <PageHero
        tag="Chia sẻ kinh nghiệm"
        title={<>Blog <em>cộng đồng</em></>}
        sub="Bài viết hay của các lập trình viên: tối ưu truy vấn, kiến trúc hệ thống lớn, bảo mật, vận hành. Bạn cũng có thể viết bài chia sẻ, bài sẽ hiển thị sau khi admin duyệt."
        icon="📰"
      />
      <div className="blog-actions">
        <Link to="/blog/write" className="btn">✍️ Viết bài</Link>
        <Link to="/blog/mine" className="btn ghost">Bài của tôi</Link>
      </div>
      {curated.error && <p className="err">Chưa có bài tuyển chọn. Admin hãy chạy ingest để nạp bài.</p>}

      <div className="tabs cats" role="tablist">
        {CATEGORIES.filter((c) => c.key === 'all' || counts.has(c.key)).map((c) => (
          <button key={c.key} role="tab" aria-selected={cat === c.key} className={`tab ${cat === c.key ? 'on' : ''}`} onClick={() => setCat(c.key)}>
            {c.icon} {c.label} <span className="tab-n">{c.key === 'all' ? posts.length : counts.get(c.key)}</span>
          </button>
        ))}
      </div>

      {del.error && <p className="err">{del.error.message}</p>}
      <div className="blog-grid">
        {shown.map((p) => {
          const body = (
            <>
              <div className="row" style={{ gap: 6 }}>
                {p.cat && <span className="chip blog-cat">{p.cat.icon} {p.cat.label}</span>}
                {p.kind === 'user' && <span className="chip blog-cat">👥 Cộng đồng</span>}
              </div>
              <h3>{p.title}</h3>
              {p.summary && <p>{p.summary}</p>}
              <div className="blog-foot">
                <span className="muted small">{p.author ? `${p.author} · ` : ''}Đọc ~{p.minutes} phút</span>
                {p.done ? <span className="tag" style={{ color: 'var(--ok)' }}>Đã đọc</span> : <span className="btn-sm">ĐỌC</span>}
              </div>
            </>
          );
          return p.kind === 'user' ? (
            <div key={p.key} className="blog-item">
              <Link to="/blog/post/$id" params={{ id: String(p.id) }} className="card blog-card">{body}</Link>
              {isAdmin && (
                <button type="button" className="blog-del" title="Xóa bài viết" aria-label="Xóa bài viết" disabled={del.isPending}
                  onClick={() => window.confirm(`Xóa bài “${p.title}”?`) && del.mutate(p.id)}>
                  <Icon name="trash" plain size={16} />
                </button>
              )}
            </div>
          ) : (
            <Link key={p.key} to="/lessons/$lessonId" params={{ lessonId: String(p.id) }} className="card blog-card" rel="noopener">{body}</Link>
          );
        })}
      </div>
    </div>
  );
}
