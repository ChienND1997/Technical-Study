import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import Spinner from '@/shared/components/Spinner.jsx';
import { STATUS } from '@/features/blog/status.js';
import { useReviewListQuery, useReviewPost } from '@/features/blog/queries.js';

const TABS = ['pending', 'approved', 'rejected'];
const PRESETS = ['Nội dung trùng với bài đã có', 'Nội dung chưa đủ chi tiết hoặc chưa chính xác', 'Chưa phù hợp chủ đề học tập', 'Cần sửa lỗi trình bày / chính tả'];

/** Moderation queue for community blog posts: approve, or reject with a required reason the author will see. */
export default function ReviewPanel() {
  const [status, setStatus] = useState('pending');
  const { data, isLoading, error } = useReviewListQuery(status);
  const review = useReviewPost();
  const [rejecting, setRejecting] = useState(null); // { id, reason } while the reason form is open

  function sendReject() {
    review.mutate({ id: rejecting.id, approve: false, reason: rejecting.reason.trim() }, { onSuccess: () => setRejecting(null) });
  }

  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} className={`tab ${status === t ? 'on' : ''}`} onClick={() => setStatus(t)}>{STATUS[t].label}</button>
        ))}
      </div>
      {isLoading && <Spinner />}
      {(error || review.error) && <p className="err">{(error || review.error).message}</p>}
      {data?.length === 0 && <p className="muted">Không có bài nào ở trạng thái “{STATUS[status].label}”.</p>}
      {data?.map((p) => (
        <div key={p.id} className="card" style={{ marginTop: 0 }}>
          <div className="row between">
            <b>{p.title}</b>
            <span className={`tag st-${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
          </div>
          <p className="muted small" style={{ margin: '4px 0' }}>{p.author} · {new Date(p.created_at).toLocaleString('vi-VN')}</p>
          {p.summary && <p style={{ margin: '6px 0' }}>{p.summary}</p>}
          {p.reject_reason && <p className="err small" style={{ margin: '4px 0' }}>Lý do: {p.reject_reason}</p>}
          <div className="row" style={{ marginTop: 8 }}>
            <Link to="/blog/post/$id" params={{ id: String(p.id) }} className="btn ghost small">Xem nội dung</Link>
            {p.status !== 'approved' && <button className="btn small" disabled={review.isPending} onClick={() => review.mutate({ id: p.id, approve: true })}>Duyệt</button>}
            {p.status !== 'rejected' && rejecting?.id !== p.id && <button className="btn ghost small" disabled={review.isPending} onClick={() => setRejecting({ id: p.id, reason: '' })}>Từ chối</button>}
          </div>
          {rejecting?.id === p.id && (
            <div className="reject-form">
              <b className="small">Lý do từ chối (tác giả sẽ thấy)</b>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {PRESETS.map((t) => <button key={t} type="button" className="chip" onClick={() => setRejecting({ ...rejecting, reason: t })}>{t}</button>)}
              </div>
              <textarea rows={3} maxLength={500} value={rejecting.reason} onChange={(e) => setRejecting({ ...rejecting, reason: e.target.value })} placeholder="Nhập lý do cụ thể để tác giả biết cần sửa gì…" autoFocus />
              <div className="row">
                <button className="btn small" disabled={review.isPending || rejecting.reason.trim().length < 3} onClick={sendReject}>Gửi từ chối</button>
                <button className="btn ghost small" onClick={() => setRejecting(null)}>Hủy</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
