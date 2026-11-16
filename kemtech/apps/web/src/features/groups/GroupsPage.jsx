import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useCreateGroup, useGroupsQuery } from './queries.js';
import { ROLE_LABEL } from './roles.js';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

/** "Nhóm học tập": the groups you belong to, plus a form to create one (the creator becomes the leader). */
export default function GroupsPage() {
  const { data, isLoading, error } = useGroupsQuery();
  const create = useCreateGroup();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  async function submit(e) {
    e.preventDefault();
    const { id } = await create.mutateAsync(form);
    setForm({ name: '', description: '' });
    setOpen(false);
    nav({ to: '/groups/$id', params: { id: String(id) } });
  }

  if (isLoading) return <PageSkeleton />;
  return (
    <div>
      <PageHero
        tag="Học cùng nhau"
        title={<>Nhóm <em>học tập</em></>}
        sub="Lập nhóm, mời bạn bè, trò chuyện và giao bài tập cho nhau. Người tạo nhóm là trưởng nhóm."
        icon="👥"
      />
      <div className="blog-actions">
        <button className="btn" onClick={() => setOpen((v) => !v)}>{open ? 'Đóng' : '＋ Tạo nhóm'}</button>
      </div>

      {open && (
        <form className="card form-card stack" onSubmit={submit}>
          <label className="field"><span>Tên nhóm</span><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Ví dụ: Cùng học Spring Boot" autoFocus /></label>
          <label className="field"><span>Mô tả</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows={3} placeholder="Mục tiêu, lịch học của nhóm…" /></label>
          {create.error && <p className="err">{create.error.message}</p>}
          <div className="row"><button className="btn" type="submit" disabled={create.isPending || form.name.trim().length < 2}>Tạo nhóm</button></div>
        </form>
      )}

      {error && <p className="err">{error.message}</p>}
      {data?.length === 0 && !open && (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Bạn chưa tham gia nhóm nào. Hãy tạo nhóm đầu tiên, hoặc chờ lời mời ở biểu tượng chuông 🔔.</p></div>
      )}
      <div className="blog-grid">
        {data?.map((g) => (
          <Link key={g.id} to="/groups/$id" params={{ id: String(g.id) }} className="card blog-card">
            <div className="row" style={{ gap: 6 }}>
              <span className="chip blog-cat">{ROLE_LABEL[g.my_role]}</span>
              {g.open_tasks > 0 && <span className="chip blog-cat">📋 {g.open_tasks} bài tập</span>}
            </div>
            <h3>{g.name}</h3>
            {g.description && <p>{g.description}</p>}
            <div className="blog-foot"><span className="muted small">👥 {g.member_count} thành viên</span><span className="btn-sm">MỞ</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
