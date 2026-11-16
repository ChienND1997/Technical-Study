import { Link } from '@tanstack/react-router';

/** Highlighted box telling the author why a post was rejected, with a shortcut to fix and resubmit it. */
export default function RejectNote({ post }) {
  if (post.status !== 'rejected') return null;
  return (
    <div className="reject-note" role="alert">
      <b>⚠️ Bài viết chưa được duyệt</b>
      <p>{post.reject_reason || 'Quản trị viên chưa ghi rõ lý do.'}</p>
      <Link to="/blog/write/$id" params={{ id: String(post.id) }} className="btn small">Sửa và gửi duyệt lại</Link>
    </div>
  );
}
