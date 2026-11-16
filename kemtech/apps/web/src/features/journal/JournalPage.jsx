import { useEffect, useState } from 'react';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import {
  useCreateNote, useCreateQuote, useDeleteNote, useDeleteQuote,
  useNotesQuery, useQuotesQuery, useUpdateNote,
} from './queries.js';

/** One note card with inline editing; saves on the Save button so typing never fights a refetch. */
function NoteCard({ n }) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(n.title);
  const [body, setBody] = useState(n.body);
  const update = useUpdateNote();
  const del = useDeleteNote();
  useEffect(() => {
    setTitle(n.title);
    setBody(n.body);
  }, [n.title, n.body]);

  const save = () => update.mutate({ id: n.id, title, body }, { onSuccess: () => setEdit(false) });
  return (
    <div className={`card note-card ${n.pinned ? 'pinned' : ''}`} style={{ marginTop: 0 }}>
      {edit ? (
        <div className="stack">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={save} disabled={update.isPending}>Lưu</button>
            <button className="btn ghost" onClick={() => setEdit(false)}>Huỷ</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row between">
            <b>{n.pinned && '📌 '}{n.title || 'Không tiêu đề'}</b>
            <span className="muted small">{new Date(n.updated_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <p className="note-body">{n.body}</p>
          <div className="row">
            <button className="btn ghost" onClick={() => setEdit(true)}>Sửa</button>
            <button className="btn ghost" onClick={() => update.mutate({ id: n.id, pinned: !n.pinned })}>{n.pinned ? 'Bỏ ghim' : 'Ghim'}</button>
            <button className="btn ghost" onClick={() => window.confirm('Xoá ghi chú này?') && del.mutate(n.id)}>Xoá</button>
          </div>
        </>
      )}
    </div>
  );
}

function Notes() {
  const { data, isLoading, error } = useNotesQuery();
  const create = useCreateNote();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const add = () => {
    if (!title.trim() && !body.trim()) return;
    create.mutate({ title, body }, { onSuccess: () => { setTitle(''); setBody(''); } });
  };
  return (
    <div>
      <div className="card stack">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề (tuỳ chọn)" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Viết gì đó: kiến thức rút ra, câu hỏi cần tìm hiểu, kế hoạch…" />
        <div><button className="btn" onClick={add} disabled={create.isPending}>Thêm ghi chú</button></div>
      </div>
      {isLoading && <Spinner />}
      {error && <p className="err">{error.message}</p>}
      <div className="grid g2" style={{ marginTop: 14 }}>
        {data?.map((n) => <NoteCard key={n.id} n={n} />)}
      </div>
      {data?.length === 0 && <p className="muted">Chưa có ghi chú nào.</p>}
    </div>
  );
}

function Quotes() {
  const { data, isLoading } = useQuotesQuery();
  const create = useCreateQuote();
  const del = useDeleteQuote();
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const add = () => {
    if (!text.trim()) return;
    create.mutate({ text, author }, { onSuccess: () => { setText(''); setAuthor(''); } });
  };
  return (
    <div>
      <p className="muted">Câu bạn thêm ở đây sẽ hiện ngẫu nhiên ở trang chủ mỗi khi mở app.</p>
      <div className="card stack">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Câu quote tuỳ ý…" maxLength={500} style={{ minHeight: 70 }} />
        <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Tác giả (tuỳ chọn)" maxLength={100} />
        <div><button className="btn" onClick={add} disabled={create.isPending}>Thêm quote</button></div>
      </div>
      {isLoading && <Spinner />}
      <div className="stack" style={{ marginTop: 14 }}>
        {data?.map((q) => (
          <div key={q.id} className="card row between" style={{ marginTop: 0 }}>
            <div><i>“{q.text}”</i>{q.author && <span className="muted small"> — {q.author}</span>}</div>
            <button className="btn ghost" onClick={() => del.mutate(q.id)} aria-label="Xoá quote">Xoá</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const [tab, setTab] = useState('notes');
  return (
    <div>
      <PageHero tag="Cá nhân" title={<>Sổ tay <em>của tôi</em></>} sub="Ghi chú tự do và những câu quote bạn yêu thích." icon="📝" />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'notes'} className={`tab ${tab === 'notes' ? 'on' : ''}`} onClick={() => setTab('notes')}>Ghi chú</button>
        <button role="tab" aria-selected={tab === 'quotes'} className={`tab ${tab === 'quotes' ? 'on' : ''}`} onClick={() => setTab('quotes')}>Quote của tôi</button>
      </div>
      {tab === 'notes' ? <Notes /> : <Quotes />}
    </div>
  );
}
