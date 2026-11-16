import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Select from '@/shared/components/Select.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import MarkdownEditor from '@/shared/components/MarkdownEditor.jsx';
import { CATEGORIES } from './categories.js';
import { useCreatePost, usePostQuery, useUpdatePost } from './queries.js';

const OPTIONS = CATEGORIES.filter((c) => c.key !== 'all').map((c) => ({ value: c.key, label: `${c.icon} ${c.label}` }));
const EMPTY = { title: '', summary: '', body: '', sourceUrl: '', category: 'other' };

/** Write a new post, or edit one of your own (editing sends it back to the review queue). */
export default function PostEditorPage({ id }) {
  const nav = useNavigate();
  const existing = usePostQuery(id);
  const create = useCreatePost();
  const update = useUpdatePost();
  const [f, setF] = useState(EMPTY);
  const [done, setDone] = useState(null); // result of the submit: { status } once sent
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    const p = existing.data;
    if (id && p) setF({ title: p.title, summary: p.summary ?? '', body: p.body, sourceUrl: p.source_url ?? '', category: p.category });
  }, [id, existing.data]);

  const busy = create.isPending || update.isPending;
  const error = create.error || update.error;
  const valid = f.title.trim().length >= 5 && f.body.trim().length >= 50;

  async function submit(e) {
    e.preventDefault();
    const body = { ...f, sourceUrl: f.sourceUrl.trim() };
    const res = id ? await update.mutateAsync({ id: Number(id), ...body }) : await create.mutateAsync(body);
    setDone({ status: res.status });
  }

  if (id && existing.isLoading) return <Spinner />;
  if (done) {
    return (
      <div className="card stack">
        <h2 style={{ margin: 0 }}>{done.status === 'approved' ? 'Đã đăng bài 🎉' : 'Đã gửi bài để duyệt 🎉'}</h2>
        <p className="muted">
          {done.status === 'approved'
            ? 'Bài viết của quản trị viên được đăng ngay, không cần duyệt.'
            : 'Bài viết sẽ hiển thị trên Blog sau khi admin duyệt. Bạn có thể theo dõi trạng thái ở “Bài của tôi”.'}
        </p>
        <div className="row">
          <button className="btn" onClick={() => nav({ to: '/blog/mine' })}>Bài của tôi</button>
          <button className="btn ghost" onClick={() => nav({ to: '/blog' })}>Về Blog</button>
        </div>
      </div>
    );
  }

  return (
    <form className="card form-card stack" onSubmit={submit}>
      <h1 style={{ margin: 0 }}>{id ? 'Sửa bài viết' : 'Viết bài chia sẻ'}</h1>
      <p className="muted small" style={{ margin: 0 }}>Nội dung viết bằng Markdown. Bài sẽ được admin duyệt trước khi hiển thị. Vui lòng không đăng thông tin cá nhân hoặc nội dung vi phạm.</p>
      <label className="field"><span>Tiêu đề</span><input type="text" value={f.title} onChange={set('title')} maxLength={200} placeholder="Ví dụ: Mình đã tối ưu truy vấn N+1 như thế nào" /></label>
      <div className="field"><span>Chủ đề</span><Select value={f.category} onChange={(v) => setF((s) => ({ ...s, category: v }))} options={OPTIONS} ariaLabel="Chủ đề" /></div>
      <label className="field"><span>Mô tả ngắn</span><input type="text" value={f.summary} onChange={set('summary')} maxLength={500} placeholder="1–2 câu hiển thị trên thẻ bài viết" /></label>
      <div className="field">
        <span>Nội dung <small className="muted">(dùng thanh công cụ để in đậm, danh sách, liên kết)</small></span>
        <MarkdownEditor
          value={f.body} onChange={(body) => setF((s) => ({ ...s, body }))} rows={16} maxLength={50000}
          placeholder="## Vấn đề&#10;...&#10;## Cách giải quyết&#10;..."
        />
      </div>
      <label className="field"><span>Link nguồn (nếu có)</span><input type="text" value={f.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" /></label>
      {error && <p className="err">{error.message}</p>}
      <div className="row">
        <button className="btn" type="submit" disabled={!valid || busy}>{busy ? 'Đang gửi…' : id ? 'Lưu và gửi duyệt lại' : 'Gửi duyệt'}</button>
        <button className="btn ghost" type="button" onClick={() => nav({ to: '/blog' })}>Hủy</button>
        {!valid && <span className="muted small">Tiêu đề ≥ 5 ký tự, nội dung ≥ 50 ký tự</span>}
      </div>
    </form>
  );
}
