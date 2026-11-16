import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAssignmentsQuery, useCreateAssignment, useDeleteAssignment, useSetAssignmentDone } from './queries.js';
import DatePicker from '@/shared/components/DatePicker.jsx';
import LessonPicker from './LessonPicker.jsx';
import { isManager } from './roles.js';
import { useDialog } from '@/shared/components/Dialog.jsx';

const EMPTY = { title: '', description: '', dueDate: '', lesson: null, everyone: true, assignees: [] };
const today = () => new Date().toISOString().slice(0, 10);

/** Assignments: managers create and delete them; each assignee ticks their own part. */
export default function TasksPanel({ groupId, myRole, members, highlightTaskId }) {
  const dlg = useDialog();
  const manager = isManager(myRole);
  const { data = [], isLoading } = useAssignmentsQuery(groupId);
  const create = useCreateAssignment();
  const del = useDeleteAssignment();
  const done = useSetAssignmentDone();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (highlightTaskId && data.length > 0) {
      const el = document.getElementById(`group-task-${highlightTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightTaskId, data]);

  const toggle = (id) => setF((s) => ({ ...s, assignees: s.assignees.includes(id) ? s.assignees.filter((x) => x !== id) : [...s.assignees, id] }));

  async function submit(e) {
    e.preventDefault();
    const res = await create.mutateAsync({
      id: groupId,
      title: f.title,
      description: f.description,
      dueDate: f.dueDate || undefined,
      lessonId: f.lesson?.id,
      assigneeIds: f.everyone ? undefined : f.assignees,
    });
    setNotice(res?.notified > 0 ? `✓ Đã giao “${f.title}”. ${res.notified} thành viên đã nhận thông báo.` : `✓ Đã giao “${f.title}”.`);
    setF(EMPTY);
    setOpen(false);
  }
  // the confirmation fades after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const canSubmit = f.title.trim().length >= 2 && (f.everyone || f.assignees.length > 0);

  return (
    <div className="stack">
      {notice && <div className="task-notice" role="status">{notice}</div>}
      {manager && (
        <>
          <div style={{ marginBottom: "15px" }}><button className="btn" onClick={() => setOpen((v) => !v)}>{open ? 'Đóng' : '＋ Giao bài tập'}</button></div>
          {open && (
            <form className="card form-card stack" onSubmit={submit}>
              <label className="field"><span>Tiêu đề</span><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} placeholder="Ví dụ: Đọc bài Event loop và tóm tắt 5 dòng" autoFocus /></label>
              <label className="field"><span>Mô tả</span><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} maxLength={2000} /></label>
              <div className="task-two">
                <div className="field"><span>Hạn nộp</span><DatePicker min={today()} value={f.dueDate} onChange={(v) => setF({ ...f, dueDate: v })} placeholder="Chọn hạn nộp (tùy chọn)" /></div>
                <div className="field"><span>Bài học đính kèm (tùy chọn)</span><LessonPicker value={f.lesson} onChange={(lesson) => setF({ ...f, lesson })} /></div>
              </div>
              <div className="field">
                <span>Giao cho</span>
                <div className="seg" role="radiogroup" aria-label="Giao cho">
                  <button type="button" role="radio" aria-checked={f.everyone} className={f.everyone ? 'on' : ''} onClick={() => setF({ ...f, everyone: true })}>👥 Cả nhóm ({members.length})</button>
                  <button type="button" role="radio" aria-checked={!f.everyone} className={!f.everyone ? 'on' : ''} onClick={() => setF({ ...f, everyone: false })}>🎯 Chọn thành viên</button>
                </div>
                {!f.everyone && (
                  <>
                    <div className="row" style={{ gap: 10 }}>
                      <button type="button" className="link-btn" onClick={() => setF({ ...f, assignees: members.map((m) => m.id) })}>Chọn tất cả</button>
                      <button type="button" className="link-btn" onClick={() => setF({ ...f, assignees: [] })}>Bỏ chọn</button>
                      <span className="muted small">Đã chọn {f.assignees.length}/{members.length}</span>
                    </div>
                    <div className="assignee-grid">
                      {members.map((m) => {
                        const on = f.assignees.includes(m.id);
                        return (
                          <button key={m.id} type="button" className={`assignee ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(m.id)}>
                            <span className="comment-av">{m.avatarUrl ? <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" /> : m.name.slice(0, 1).toUpperCase()}</span>
                            <span className="assignee-name">{m.name}</span>
                            <span className="assignee-ck" aria-hidden="true">{on ? '✓' : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              {create.error && <p className="err">{create.error.message}</p>}
              <div className="row"><button className="btn" type="submit" disabled={!canSubmit || create.isPending}>Giao bài</button></div>
            </form>
          )}
        </>
      )}

      {isLoading && <p className="muted">Đang tải…</p>}
      {!isLoading && data.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Chưa có bài tập nào.</p></div>}
      {data.map((a) => {
        const overdue = a.due_date && !a.my_done_at && a.due_date < today();
        const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
        const isHighlighted = highlightTaskId === a.id;
        return (
          <div
            key={a.id}
            id={`group-task-${a.id}`}
            className={`card task ${isHighlighted ? 'task-highlighted' : ''}`}
            style={{ marginTop: 0 }}
          >
            <div className="row between">
              <b>{a.title}</b>
              {manager && <button className="link-btn danger" onClick={async () => (await dlg.confirm({ message: 'Xóa bài tập này?', confirmText: 'Xóa', danger: true })) && del.mutate({ id: groupId, aid: a.id })}>Xóa</button>}
            </div>
            <p className="muted small" style={{ margin: '4px 0' }}>
              {a.creator} giao · {new Date(a.created_at).toLocaleDateString('vi-VN')}
              {a.due_date && <span className={overdue ? 'err' : ''}> · Hạn {new Date(a.due_date).toLocaleDateString('vi-VN')}{overdue ? ' (quá hạn)' : ''}</span>}
            </p>
            {a.description && <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{a.description}</p>}
            {a.lesson_id && <Link to="/lessons/$lessonId" params={{ lessonId: String(a.lesson_id) }} className="chip">📖 {a.lesson_title || 'Mở bài học'}</Link>}
            <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${pct}%` }} /></div>
            <div className="row between" style={{ marginTop: 6 }}>
              <span className="muted small">{a.done}/{a.total} người đã xong</span>
              {a.assigned_to_me && (
                <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!a.my_done_at} disabled={done.isPending} onChange={(e) => done.mutate({ id: groupId, aid: a.id, done: e.target.checked })} />
                  <span>{a.my_done_at ? 'Tôi đã xong' : 'Đánh dấu đã xong'}</span>
                </label>
              )}
            </div>
            {manager && a.people.length > 0 && (
              <div className="chips" style={{ marginTop: 8 }}>
                {a.people.map((p) => <span key={p.id} className={`chip ${p.done ? 'ok' : ''}`}>{p.done ? '✓' : '○'} {p.name}</span>)}
              </div>
            )}
          </div>
        );
      })}
      {(del.error || done.error) && <p className="err">{(del.error || done.error).message}</p>}
    </div>
  );
}