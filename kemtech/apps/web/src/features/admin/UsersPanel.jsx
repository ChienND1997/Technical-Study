import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PasswordInput from '@/shared/components/PasswordInput.jsx';
import Select from '@/shared/components/Select.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useMeQuery } from '@/features/auth/queries.js';
import * as a from './api.js';
import { useDialog } from '@/shared/components/Dialog.jsx';

const ROLES = [{ value: 'user', label: 'Người dùng' }, { value: 'admin', label: 'Quản trị viên' }];
const FILTERS = [['all', 'Tất cả'], ['active', 'Đang hoạt động'], ['inactive', 'Vô hiệu hóa'], ['deleted', 'Đã xóa']];
const stateOf = (u) => (u.deleted_at ? 'deleted' : u.active ? 'active' : 'inactive');
const STATE_LABEL = { active: 'Hoạt động', inactive: 'Vô hiệu hóa', deleted: 'Đã xóa' };

/** Admin user management: create, change role, activate/deactivate, soft delete and restore. */
export default function UsersPanel() {
  const dlg = useDialog();
  const qc = useQueryClient();
  const me = useMeQuery().data;
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'users'], queryFn: a.fetchUsers });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  // act.mutate(fn, 'thông báo thành công'): the message becomes the success toast
  const act = useMutation({
    mutationFn: ({ fn }) => fn(),
    meta: { success: (_d, v) => v.ok },
    onSuccess: refresh,
  });
  const run = (fn, ok) => act.mutate({ fn, ok });
  const create = useMutation({ mutationFn: a.createUser, meta: { success: 'Đã tạo tài khoản' }, onSuccess: () => { refresh(); setForm({ name: '', email: '', password: '', role: 'user' }); } });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [filter, setFilter] = useState('all');

  const users = (data ?? []).filter((u) => filter === 'all' || stateOf(u) === filter);
  const err = act.error || create.error;

  return (
    <div className="stack">
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
        <b>Tạo tài khoản</b>
        <p className="muted small" style={{ margin: 0 }}>Người dùng đăng nhập bằng tên hoặc email cùng mật khẩu này, hoặc bằng Google với đúng email đó.</p>
        <div className="admin-form">
          <input type="text" placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="text" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <PasswordInput placeholder="Mật khẩu (≥ 6 ký tự)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(role) => setForm({ ...form, role })} options={ROLES} ariaLabel="Quyền" />
          <button className="btn" type="submit" disabled={create.isPending || !form.name.trim() || !form.email.trim() || form.password.length < 6}>Tạo</button>
        </div>
        {form.email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(form.email.trim()) && <p className="field-err">Email chưa đúng định dạng (ví dụ: ten@congty.com).</p>}
        {form.password !== '' && form.password.length < 6 && <p className="field-err">Mật khẩu cần ít nhất 6 ký tự.</p>}
      </form>

      <div className="tabs" role="tablist">
        {FILTERS.map(([k, l]) => (
          <button key={k} className={`tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {err && <p className="err">{err.message}</p>}
      {isLoading && <Spinner />}
      {error && <p className="err">{error.message}</p>}

      {users.map((u) => {
        const st = stateOf(u);
        const self = u.id === me?.id;
        const isAdmin = u.role === 'admin';
        const lock = self;
        const lockTip = undefined;
        return (
          <div key={u.id} className={`card user-row ${st !== 'active' ? 'off' : ''}`} style={{ marginTop: 0 }}>
            <div className="user-main">
              {u.online && <i className="online-dot" title="Đang online" />}<b>{u.name}</b> {self && <span className="tag">bạn</span>}
              <div className="muted small">{u.email ?? 'chưa có email'} · {u.xp} XP</div>
            </div>
            <span className={`tag st-${st === 'active' ? 'ok' : st === 'inactive' ? 'warn' : 'bad'}`}>{STATE_LABEL[st]}</span>
            {isAdmin ? (
              // admin rows have no controls: role, status and deletion cannot be changed here
              <span className="tag user-admin-tag">Quản trị viên</span>
            ) : (
              <>
            <div className="user-role">
              <Select value={u.role} options={ROLES} ariaLabel="Quyền" onChange={(role) => run(() => a.setRole(u.id, role), `Đã đổi quyền của ${u.name}`)} />
            </div>
            <div className="row user-actions">
              {st !== 'deleted' && (
                <button className="btn ghost small" onClick={async () => { const pw = await dlg.prompt({ title: 'Đặt mật khẩu', message: `Mật khẩu mới cho ${u.name}`, label: 'Mật khẩu mới', type: 'password', minLength: 6, confirmText: 'Đặt mật khẩu' }); if (pw) run(() => a.resetPassword(u.id, pw), `Đã đặt lại mật khẩu cho ${u.name}`); }}>Đặt mật khẩu</button>
              )}
              {st !== 'deleted' && (
                <button className="btn ghost small" disabled={lock && u.active} title={lockTip} onClick={() => run(() => a.setActive(u.id, !u.active), u.active ? `Đã vô hiệu hóa ${u.name}` : `Đã kích hoạt ${u.name}`)}>
                  {u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
              )}
              {st === 'deleted' ? (
                <button className="btn ghost small" onClick={() => run(() => a.restoreUser(u.id), `Đã khôi phục ${u.name}`)}>Khôi phục</button>
              ) : (
                <button className="btn ghost small" disabled={lock} title={lockTip} onClick={async () => (await dlg.confirm({ message: `Xóa tài khoản ${u.name}? Dữ liệu vẫn được giữ và có thể khôi phục.`, confirmText: 'Xóa', danger: true })) && run(() => a.softDelete(u.id), `Đã xóa tài khoản ${u.name}`)}>Xóa</button>
              )}
            </div>
              </>
            )}
          </div>
        );
      })}
      {!isLoading && users.length === 0 && <p className="muted">Không có tài khoản nào.</p>}
    </div>
  );
}
