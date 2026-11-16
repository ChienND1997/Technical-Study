import { useState } from 'react';
import { useDialog } from '@/shared/components/Dialog.jsx';
import DatePicker from '@/shared/components/DatePicker.jsx';
import MarkdownEditor from '@/shared/components/MarkdownEditor.jsx';
import AnnouncementCard from '@/features/announcements/AnnouncementCard.jsx';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { KINDS, fmtWhen } from '@/features/announcements/kinds.js';
import {
  useAllAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from '@/features/announcements/queries.js';

/** Status of an announcement relative to now. */
function statusOf(a) {
  const now = Date.now();
  if (!a.active) return { label: 'Đã ẩn', cls: 'off' };
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return { label: 'Chờ hiển thị', cls: 'wait' };
  if (a.ends_at && new Date(a.ends_at).getTime() < now) return { label: 'Đã hết hạn', cls: 'off' };
  return { label: 'Đang hiển thị', cls: 'on' };
}

const EMPTY = { kind: 'info', title: '', body: '', from: '', to: '' };
const pad = (n) => String(n).padStart(2, '0');
/** ISO timestamp -> "YYYY-MM-DD" in local time, for the date pickers. */
const toDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Admin tab: compose a system announcement and manage the existing ones. */
export default function AnnouncementsPanel() {
  const dlg = useDialog();
  const list = useAllAnnouncements();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // announcement being edited, or null for a new one
  const set = (patch) => setF((s) => ({ ...s, ...patch }));
  const valid = f.title.trim().length >= 3;

  const reset = () => {
    setF(EMPTY);
    setEditing(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const payload = {
      kind: f.kind,
      title: f.title.trim(),
      body: f.body.trim(),
      startsAt: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : undefined,
      endsAt: f.to ? new Date(`${f.to}T23:59:59`).toISOString() : undefined,
      active: editing ? editing.active : true,
    };
    if (editing) update.mutate({ id: editing.id, ...payload }, { onSuccess: reset });
    else create.mutate(payload, { onSuccess: reset });
  };

  const edit = (a) => {
    setEditing(a);
    setF({ kind: a.kind, title: a.title, body: a.body ?? '', from: toDay(a.starts_at), to: toDay(a.ends_at) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (a) => {
    if (await dlg.confirm({ message: `Xóa thông báo "${a.title}"?`, confirmText: 'Xóa', danger: true })) remove.mutate(a.id);
  };

  return (
    <div className="stack">
      <form className="card ann-form" onSubmit={submit}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>{editing ? 'Sửa thông báo' : 'Tạo thông báo cho mọi người'}</h3>
          {editing && <button type="button" className="link-btn" onClick={reset}>Hủy sửa</button>}
        </div>

        <div className="ann-kinds" role="radiogroup" aria-label="Loại thông báo">
          {Object.entries(KINDS).map(([k, v]) => (
            <button
              key={k} type="button" role="radio" aria-checked={f.kind === k}
              className={`chip pick ${f.kind === k ? 'on' : ''}`} onClick={() => set({ kind: k })}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <label className="ann-field">
          <span>Tiêu đề</span>
          <input type="text" maxLength={120} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ví dụ: Bảo trì hệ thống lúc 22:00 tối nay" aria-invalid={f.title !== '' && !valid} />
          {f.title !== '' && !valid && <small className="field-err">Tiêu đề cần ít nhất 3 ký tự.</small>}
        </label>

        <div className="ann-field">
          <span>Nội dung <small className="muted">(dùng thanh công cụ để in đậm, danh sách, liên kết)</small></span>
          <MarkdownEditor value={f.body} onChange={(body) => set({ body })} rows={9} placeholder="Viết nội dung chi tiết: thời gian, ảnh hưởng, tính năng mới có gì…" />
        </div>

        <div className="ann-dates">
          <label className="ann-field">
            <span>Hiển thị từ ngày</span>
            <DatePicker value={f.from} onChange={(v) => set({ from: v })} placeholder="Ngay bây giờ" />
          </label>
          <label className="ann-field">
            <span>Đến hết ngày</span>
            <DatePicker value={f.to} min={f.from || undefined} onChange={(v) => set({ to: v })} placeholder="Không giới hạn" />
          </label>
        </div>

        <div className="ann-field">
          <span>Xem trước (người dùng sẽ thấy như thế này)</span>
          <div className="ann-preview"><AnnouncementCard kind={f.kind} title={f.title.trim()} body={f.body.trim()} /></div>
        </div>

        {(create.isError || update.isError) && <ErrorBox error={create.error || update.error} />}
        <div className="row">
          <button className="btn" disabled={!valid || create.isPending || update.isPending}>
            {editing ? 'Lưu thay đổi' : create.isPending ? 'Đang gửi…' : 'Đăng thông báo'}
          </button>
          {!valid && <small className="muted">Tiêu đề cần ít nhất 3 ký tự.</small>}
        </div>
      </form>

      <div className="card stack">
        <h3>Thông báo đã tạo</h3>
        {list.isError && <ErrorBox error={list.error} />}
        {list.data?.length === 0 && <p className="muted">Chưa có thông báo nào.</p>}
        {(list.data ?? []).map((a) => {
          const k = KINDS[a.kind] ?? KINDS.info;
          const st = statusOf(a);
          return (
            <div key={a.id} className="ann-row">
              <span aria-hidden="true">{k.icon}</span>
              <div className="ann-row-main">
                <b>{a.title}</b>
                <small className="muted">
                  {k.label}
                  {a.starts_at && ` · từ ${fmtWhen(a.starts_at)}`}
                  {a.ends_at && ` · đến ${fmtWhen(a.ends_at)}`}
                </small>
              </div>
              <span className={`ann-st ${st.cls}`}>{st.label}</span>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => update.mutate({ id: a.id, active: !a.active })}
              >
                {a.active ? 'Ẩn' : 'Hiện'}
              </button>
              <button type="button" className="btn ghost small" onClick={() => edit(a)}>Sửa</button>
              <button type="button" className="btn ghost small danger" onClick={() => del(a)}>Xóa</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
