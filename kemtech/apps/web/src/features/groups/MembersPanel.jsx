import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import Icon from '@/shared/components/Icon.jsx';
import { useMeQuery } from '@/features/auth/queries.js';
import { useUserSearch } from '@/features/notifications/queries.js';
import { useCancelInvite, useInviteUser, useRemoveMember, useSetMemberRole, useTransferLeader } from './queries.js';
import { ROLE_LABEL, isManager } from './roles.js';
import { useDialog } from '@/shared/components/Dialog.jsx';

/** Members with role actions, plus inviting people by name search. */
export default function MembersPanel({ groupId, myRole, realRole, members, invites }) {
  const dlg = useDialog();
  const me = useMeQuery().data?.user;
  const nav = useNavigate();
  const manager = isManager(myRole);
  const leader = myRole === 'leader';
  const remove = useRemoveMember();
  const setRole = useSetMemberRole();
  const transfer = useTransferLeader();
  const invite = useInviteUser();
  const cancel = useCancelInvite();
  const [q, setQ] = useState('');
  const found = (useUserSearch(q.trim()).data ?? []).filter((u) => !members.some((m) => m.id === u.id));
  const err = remove.error || setRole.error || transfer.error || invite.error || cancel.error;

  async function leave() {
    if (!(await dlg.confirm({ title: 'Rời nhóm', message: 'Rời khỏi nhóm này?', confirmText: 'Rời nhóm', danger: true }))) return;
    await remove.mutateAsync({ id: groupId, userId: me.id });
    nav({ to: '/groups', replace: true });
  }

  return (
    <div className="stack">
      {manager && (
        <div className="card invite-box">
          <div className="invite-head">
            <span className="invite-badge">➕</span>
            <div>
              <b>Mời thành viên</b>
              <p className="muted small">Tìm theo tên rồi gửi lời mời. Người được mời nhận thông báo ở biểu tượng chuông 🔔 để chấp nhận hoặc từ chối.</p>
            </div>
          </div>
          <span className="input-ic">
            <Icon name="search" plain size={18} />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên người dùng để tìm…" />
            {q && <button type="button" className="pw-eye" aria-label="Xóa tìm kiếm" onClick={() => setQ('')}>✕</button>}
          </span>
          {q.trim() && (
            <div className="invite-results">
              {found.length === 0 && <p className="muted small" style={{ margin: 0, padding: '10px 4px' }}>Không tìm thấy người dùng phù hợp.</p>}
              {found.map((u) => {
                const pending = invites.some((i) => i.invitee_id === u.id);
                return (
                  <div key={u.id} className="invite-result">
                    <Link to="/users/$userId" params={{ userId: String(u.id) }} className="comment-av">{u.avatarUrl ? <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" /> : u.name.slice(0, 1).toUpperCase()}</Link>
                    <Link to="/users/$userId" params={{ userId: String(u.id) }} className="invite-name comment-author-link">{u.name}</Link>
                    <button className={pending ? 'btn ghost small' : 'btn small'} disabled={pending || invite.isPending} onClick={() => invite.mutate({ id: groupId, userId: u.id })}>
                      {pending ? '✓ Đã mời' : 'Mời'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {invites.length > 0 && (
            <div className="invite-pending">
              <span className="muted small">Đang chờ phản hồi ({invites.length})</span>
              <div className="chips">
                {invites.map((i) => (
                  <span key={i.id} className="chip">{i.name} <button type="button" className="link-btn danger" onClick={() => cancel.mutate({ id: groupId, inviteId: i.id })}>Hủy</button></span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card stack">
        <b>Thành viên ({members.length})</b>
        {members.map((m) => {
          const self = m.id === me?.id;
          // who can act on whom: leader on anyone but self; deputies only on plain members
          const canRemove = !self && m.role !== 'leader' && (leader || (manager && m.role === 'member'));
          return (
            <div key={m.id} className="member-row">
              <Link to="/users/$userId" params={{ userId: String(m.id) }} className={`comment-av ${m.blocked ? 'blocked' : ''}`}>{m.avatarUrl ? <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" /> : m.name.slice(0, 1).toUpperCase()}{m.online && <i className="online-dot mini" />}</Link>
              <div className="member-main">
                <Link to="/users/$userId" params={{ userId: String(m.id) }} className="comment-author-link"><b>{m.name}</b></Link> {self && <span className="tag">bạn</span>}
                {m.blocked && <span className="blocked-badge" title="Tài khoản này đã bị khóa hoặc không còn tồn tại"> 🚫 Đã khóa</span>}
                <div className="muted small">{ROLE_LABEL[m.role]}{m.online ? ' · đang online' : ''}</div>
              </div>
              <div className="row member-actions">
                {leader && !self && m.role === 'member' && <button className="btn ghost small" onClick={() => setRole.mutate({ id: groupId, userId: m.id, role: 'deputy' })}>Làm phó nhóm</button>}
                {leader && !self && m.role === 'deputy' && <button className="btn ghost small" onClick={() => setRole.mutate({ id: groupId, userId: m.id, role: 'member' })}>Bỏ phó nhóm</button>}
                {leader && !self && <button className="btn ghost small" onClick={async () => (await dlg.confirm({ message: `Trao quyền trưởng nhóm cho ${m.name}? Bạn sẽ trở thành phó nhóm.`, confirmText: 'Trao quyền' })) && transfer.mutate({ id: groupId, userId: m.id })}>Trao quyền trưởng</button>}
                {canRemove && <button className="btn ghost small" onClick={async () => (await dlg.confirm({ message: `Xóa ${m.name} khỏi nhóm?`, confirmText: 'Xóa', danger: true })) && remove.mutate({ id: groupId, userId: m.id })}>Xóa</button>}
              </div>
            </div>
          );
        })}
        {err && <p className="err">{err.message}</p>}
        {realRole !== 'leader' && <div><button className="btn ghost" onClick={leave}>Rời nhóm</button></div>}
      </div>
    </div>
  );
}
