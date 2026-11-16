import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useGroupQuery, useGroupsQuery, useInviteUser } from '@/features/groups/queries.js';
import ChatPanel from '@/features/groups/ChatPanel.jsx';
import { isManager } from '@/features/groups/roles.js';
import Icon from '@/shared/components/Icon.jsx';
import { fetchOnline } from './api.js';

const KEY = 'kt-online-mode';
const readMode = () => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'min' || v === 'closed' || v === 'full') return v;
    return window.innerWidth < 1100 ? 'closed' : 'full'; // first visit on a small screen: only a small floating button
  } catch {
    return 'full';
  }
};

/** Chat of one group inside the panel (members and role come from the group detail). */
function GroupChat({ groupId, name, onBack }) {
  const { data } = useGroupQuery(groupId);
  return (
    <div className="oc-chat">
      <div className="oc-chat-head">
        <button type="button" className="oc-back" onClick={onBack} aria-label="Quay lại">←</button>
        <b>{name}</b>
        <Link to="/groups/$id" params={{ id: String(groupId) }} className="small">Mở trang nhóm</Link>
      </div>
      {data ? <ChatPanel groupId={groupId} myRole={data.myRole} members={data.members} compact /> : <p className="muted small online-empty">Đang tải…</p>}
    </div>
  );
}

/** Community-style panel in the bottom-right corner: who is online, a quick "invite to group" and my groups. */
export default function OnlineCard() {
  const [mode, setMode] = useState(readMode); // 'full' | 'min' (header only) | 'closed' (floating button)
  const [tab, setTab] = useState('online');
  const { data = [] } = useQuery({ queryKey: ['presence', 'online'], queryFn: fetchOnline, refetchInterval: 60000 });
  const allGroups = useGroupsQuery().data ?? [];
  const groups = allGroups.filter((g) => isManager(g.my_role)); // only groups where the user can invite
  const invite = useInviteUser();
  const [note, setNote] = useState(null); // { userId, text, bad } shown in the row for a few seconds
  const [pickFor, setPickFor] = useState(null); // user id whose group list is expanded
  const [chat, setChat] = useState(null); // { id, name } of the group chat open in the panel
  const unreadChats = allGroups.reduce((a, g) => a + (g.unread_messages ?? 0), 0);
  const openChat = chat && allGroups.find((g) => g.id === chat.id) ? chat : null;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* the panel state just is not remembered */
    }
  }, [mode]);
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  async function send(user, group) {
    setPickFor(null);
    try {
      await invite.mutateAsync({ id: group.id, userId: user.id });
      setNote({ userId: user.id, text: `✓ Đã mời vào “${group.name}”` });
    } catch (e) {
      setNote({ userId: user.id, text: e.message, bad: true });
    }
  }
  /** One manageable group: invite straight away; several: expand the list under the row. */
  const ask = (user) => (groups.length === 1 ? send(user, groups[0]) : setPickFor((v) => (v === user.id ? null : user.id)));

  if (mode === 'closed') {
    return (
      <button type="button" className="oc-fab" onClick={() => setMode('full')} aria-label="Mở danh sách người dùng online" title="Người dùng online">
        <Icon name="group" plain size={24} />
        {unreadChats > 0 ? <span className="oc-fab-n unread">{unreadChats > 99 ? '99+' : unreadChats}</span> : data.length > 0 && <span className="oc-fab-n">{data.length}</span>}
      </button>
    );
  }

  return (
    <aside className={`oc ${mode === 'min' ? 'min' : ''}`} aria-label="Người dùng đang online">
      <header className="oc-head">
        <Icon name="group" plain size={22} />
        <div className="oc-title">
          <b><i className="oc-live" /> {data.length} đang online</b>
        </div>
        {unreadChats > 0 && <span className="oc-badge" title="Tin nhắn nhóm chưa đọc">💬 {unreadChats > 99 ? '99+' : unreadChats}</span>}
        <button type="button" className="oc-btn" onClick={() => setMode(mode === 'min' ? 'full' : 'min')} aria-label={mode === 'min' ? 'Mở rộng' : 'Thu nhỏ'} title={mode === 'min' ? 'Mở rộng' : 'Thu nhỏ'}>{mode === 'min' ? '▢' : '–'}</button>
        <button type="button" className="oc-btn" onClick={() => setMode('closed')} aria-label="Đóng" title="Đóng">×</button>
      </header>

      {mode === 'full' && openChat && <GroupChat groupId={openChat.id} name={openChat.name} onBack={() => setChat(null)} />}
      {mode === 'full' && !openChat && (
        <>
          <div className="oc-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'online'} className={tab === 'online' ? 'on' : ''} onClick={() => setTab('online')}>Đang online</button>
            <button type="button" role="tab" aria-selected={tab === 'groups'} className={tab === 'groups' ? 'on' : ''} onClick={() => setTab('groups')}>Nhóm của tôi{unreadChats > 0 && <span className="oc-dot-n">{unreadChats > 99 ? '99+' : unreadChats}</span>}</button>
          </div>

          <div className="oc-body">
            {tab === 'online' && (
              <>
                {data.length === 0 && <p className="muted small online-empty">Chưa có ai khác online.</p>}
                {data.map((u) => (
                  <div key={u.id} className="oc-item">
                    <div className="oc-row">
                      <Link to="/users/$userId" params={{ userId: String(u.id) }} className="oc-av">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" /> : u.name.slice(0, 2).toUpperCase()}
                        <i className="oc-live mini" />
                      </Link>
                      <Link to="/users/$userId" params={{ userId: String(u.id) }} className="oc-info" style={{ textDecoration: 'none', color: 'inherit' }}><b>{u.name}</b><span className="muted small">đang online</span></Link>
                      {groups.length > 0 && <button type="button" className="btn-sm" disabled={invite.isPending} onClick={() => ask(u)}>Mời</button>}
                    </div>
                    {note?.userId === u.id && <p className={`online-note small ${note.bad ? 'err' : ''}`}>{note.text}</p>}
                    {pickFor === u.id && (
                      <div className="invite-pick">
                        <span className="muted small">Mời vào nhóm:</span>
                        {groups.map((g) => (
                          <button key={g.id} type="button" className="menu-item" onClick={() => send(u, g)}>{g.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {groups.length === 0 && data.length > 0 && <p className="muted small online-empty">Tạo một nhóm học tập để mời bạn bè.</p>}
              </>
            )}

            {tab === 'groups' && (
              <>
                {allGroups.length === 0 && <p className="muted small online-empty">Bạn chưa tham gia nhóm nào.</p>}
                {allGroups.map((g) => (
                  <button key={g.id} type="button" className="oc-row oc-link" onClick={() => setChat({ id: g.id, name: g.name })}>
                    <span className="oc-av">{g.name.slice(0, 2).toUpperCase()}</span>
                    <div className="oc-info">
                      <b>{g.name}</b>
                      <span className="muted small">{g.unread_messages > 0 ? `${g.unread_messages} tin nhắn mới` : `${g.member_count} thành viên`}</span>
                    </div>
                    {g.unread_messages > 0 && <span className="oc-dot-n">{g.unread_messages > 99 ? '99+' : g.unread_messages}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
