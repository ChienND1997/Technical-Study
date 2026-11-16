import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDeleteGroup, useUpdateGroup } from './queries.js';
import { useDialog } from '@/shared/components/Dialog.jsx';

/** Edit the group (leader and deputies); only the leader can delete it. */
export default function SettingsPanel({ group, myRole }) {
  const dlg = useDialog();
  const update = useUpdateGroup();
  const del = useDeleteGroup();
  const nav = useNavigate();
  const [f, setF] = useState({ name: group.name, description: group.description });
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    await update.mutateAsync({ id: group.id, ...f });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  async function remove() {
    if (!(await dlg.confirm({ title: 'Xóa nhóm', message: `Xóa nhóm “${group.name}”? Toàn bộ tin nhắn và bài tập sẽ mất.`, confirmText: 'Xóa nhóm', danger: true }))) return;
    await del.mutateAsync(group.id);
    nav({ to: '/groups', replace: true });
  }

  return (
    <div className="stack">
      <form className="card form-card stack" onSubmit={save}>
        <b>Thông tin nhóm</b>
        <label className="field"><span>Tên nhóm</span><input type="text" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setSaved(false); }} maxLength={80} /></label>
        <label className="field"><span>Mô tả</span><textarea value={f.description} onChange={(e) => { setF({ ...f, description: e.target.value }); setSaved(false); }} maxLength={500} rows={3} /></label>
        {update.error && <p className="err">{update.error.message}</p>}
        <div className="row"><button className="btn" type="submit" disabled={update.isPending || f.name.trim().length < 2}>Lưu</button>{saved && <span className="muted small">Đã lưu ✓</span>}</div>
      </form>
      {myRole === 'leader' && (
        <div className="card stack">
          <b>Xóa nhóm</b>
          <p className="muted small" style={{ margin: 0 }}>Chỉ trưởng nhóm được xóa. Hành động này không thể hoàn tác.</p>
          {del.error && <p className="err">{del.error.message}</p>}
          <div><button className="btn ghost" onClick={remove} disabled={del.isPending}>Xóa nhóm này</button></div>
        </div>
      )}
    </div>
  );
}
