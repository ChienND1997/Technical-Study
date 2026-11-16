import { Link } from '@tanstack/react-router';
import Spinner from '@/shared/components/Spinner.jsx';
import { STATUS } from './status.js';
import RejectNote from './RejectNote.jsx';
import { useDeletePost, useMyPostsQuery } from './queries.js';

/** The signed-in user's own posts with their moderation status. */
export default function MyPostsPage() {
  const { data, isLoading, error } = useMyPostsQuery();
  const del = useDeletePost();
  if (isLoading) return <Spinner />;
  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Bài của tôi</h1>
        <div className="row"><Link to="/blog/write" className="btn">✍️ Viết bài</Link><Link to="/blog" className="btn ghost">Về Blog</Link></div>
      </div>
      {error && <p className="err">{error.message}</p>}
      {data?.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Bạn chưa có bài viết nào. Hãy chia sẻ kinh nghiệm đầu tiên!</p></div>}
      <div className="stack">
        {data?.map((p) => {
          const st = STATUS[p.status];
          return (
            <div key={p.id} className="card my-post">
              <div className="row between">
                <b>{p.title}</b>
                <span className={`tag st-${st.cls}`}>{st.label}</span>
              </div>
              <RejectNote post={p} />
              <div className="row" style={{ marginTop: 10 }}>
                <Link to="/blog/post/$id" params={{ id: String(p.id) }} className="btn-sm">XEM</Link>
                <Link to="/blog/write/$id" params={{ id: String(p.id) }} className="btn ghost small">Sửa</Link>
                <button className="btn ghost small" onClick={() => window.confirm('Xóa bài viết này?') && del.mutate(p.id)}>Xóa</button>
                <span className="muted small">{new Date(p.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
