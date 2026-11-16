import RejectNote from './RejectNote.jsx';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMeQuery } from '@/features/auth/queries.js';
import Markdown from '@/shared/components/Markdown.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import Comments from './Comments.jsx';
import QuoteSelector from './QuoteSelector.jsx';
import { catByKey } from './categories.js';
import { STATUS } from './status.js';
import { useDeletePost, usePostQuery } from './queries.js';
import { useDialog } from '@/shared/components/Dialog.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

/** Reads one community post. Authors and admins can also open posts that are not approved yet. */
export default function PostPage({ id }) {
  const dlg = useDialog();
  const { data: p, isLoading, error } = usePostQuery(id);
  const me = useMeQuery().data?.user;
  const del = useDeletePost();
  const nav = useNavigate();
  if (isLoading) return <PageSkeleton />;
  if (error || !p) return <div className="card"><p className="err">{error?.message || 'Không tìm thấy bài viết'}</p><Link to="/blog">← Về Blog</Link></div>;
  const cat = catByKey(p.category);
  const st = STATUS[p.status];
  return (
    <div className="post-wrap">
    <article className="card post">
      <Link to="/blog" className="muted small">← Về Blog</Link>
      <div className="row" style={{ gap: 6, marginTop: 10 }}>
        {cat && <span className="chip">{cat.icon} {cat.label}</span>}
        {p.status !== 'approved' && <span className={`tag st-${st.cls}`}>{st.label}</span>}
      </div>
      <h1 className="post-title">{p.title}</h1>
      {(me?.isAdmin || p.user_id === me?.id) && (
        <p><button type="button" className="btn ghost small" disabled={del.isPending} onClick={async () => { if (await dlg.confirm({ message: 'Xóa bài viết này?', confirmText: 'Xóa', danger: true })) { await del.mutateAsync(p.id); nav({ to: '/blog' }); } }}>🗑 Xóa bài viết</button></p>
      )}
      <p className="muted small">{p.author} · {new Date(p.created_at).toLocaleDateString('vi-VN')} · Đọc ~{p.minutes} phút</p>
      {p.user_id === me?.id && <RejectNote post={p} />}
      {p.user_id !== me?.id && p.status === 'rejected' && p.reject_reason && <p className="err">Lý do từ chối: {p.reject_reason}</p>}
      {p.summary && <p className="post-sum">{p.summary}</p>}
      <p className="muted small">Bôi đen một đoạn văn để trích dẫn vào bình luận.</p>
      <QuoteSelector><Markdown>{p.body}</Markdown></QuoteSelector>
      {p.source_url && <p className="small"><a href={p.source_url} target="_blank" rel="noreferrer noopener">Đọc bản gốc ↗</a> <span className="muted">({p.source_url})</span></p>}
    </article>
    {p.status === 'approved' && <Comments type="post" id={p.id} />}
    </div>
  );
}
