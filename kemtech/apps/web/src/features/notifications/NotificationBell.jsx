import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import Icon from '@/shared/components/Icon.jsx';
import Menu from '@/shared/components/Menu.jsx';
import { NOTIFICATION_EVENT } from '@/features/realtime/useRealtime.js';
import { useRespondInvite } from '@/features/groups/queries.js';
import { useClearNotifications, useDeleteNotification, useMarkRead, useNotificationsQuery, useUnreadNotifications } from './queries.js';
import { useDialog } from '@/shared/components/Dialog.jsx';
import { KINDS } from '@/features/announcements/kinds.js';
import { useActiveAnnouncements, useAnnouncementHistory } from '@/features/announcements/queries.js';
import { hideAnnouncements, openAnnouncement, useHidden, useSeen } from '@/features/announcements/seen.js';

const ICON = {
  mention: '💬', comment: '💭', post_approved: '✅', post_rejected: '⚠️',
  group_invite: '👥', group_message: '💬', group_mention: '🔔', group_joined: '🎉', group_declined: '🚫', group_role: '⭐', assignment: '📋',
  group_reaction: '❤️',
};

function ago(d) {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
}

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA'); // local YYYY-MM-DD

/** Section title like Facebook: "today", "yesterday", then the full date (shown in Vietnamese). */
function dayLabel(key) {
  const now = new Date();
  if (key === dayKey(now)) return 'Hôm nay';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (key === dayKey(y)) return 'Hôm qua';
  return new Date(`${key}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Dropdown content: mounted only while the menu is open. Notifications are grouped by day. */
function NotificationList({ unread }) {
  const dlg = useDialog();
  const { data = [], isLoading } = useNotificationsQuery();
  const read = useMarkRead();
  const respond = useRespondInvite();
  const del = useDeleteNotification();
  const clear = useClearNotifications();
  const hidden = useHidden();
  const announcements = (useAnnouncementHistory().data ?? []).filter((a) => !hidden.includes(a.id));
  const seen = useSeen();

  // the API returns newest first, so days and the items inside them stay in order
  const sections = useMemo(() => {
    const map = new Map();
    for (const n of data) {
      const k = dayKey(n.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(n);
    }
    return [...map].map(([key, items]) => ({ key, label: dayLabel(key), items }));
  }, [data]);

  return (
    <div className="notif-pop">
      <div className="notif-head">
        <b>Thông báo</b>
        <span className="row" style={{ gap: 12 }}>
          {unread > 0 && <button type="button" className="link-btn" onClick={() => read.mutate(undefined)}>Đọc tất cả</button>}
          {(data.length > 0 || announcements.length > 0) && <button type="button" className="link-btn danger" onClick={async () => { if (await dlg.confirm({ message: 'Xóa tất cả thông báo?', confirmText: 'Xóa', danger: true })) { if (data.length > 0) clear.mutate(); hideAnnouncements(announcements.map((a) => a.id)); } }}>Xóa tất cả</button>}
        </span>
      </div>
      {isLoading && <p className="muted small notif-empty">Đang tải…</p>}
      {!isLoading && data.length === 0 && announcements.length === 0 && <p className="muted small notif-empty">Chưa có thông báo nào.</p>}
      <div className="notif-list">
        {announcements.length > 0 && (
          <section>
            <h4 className="notif-day">Thông báo hệ thống</h4>
            {announcements.map((a) => {
              const k = KINDS[a.kind] ?? KINDS.info;
              return (
                <div key={a.id} className={`notif-row ${seen.includes(a.id) ? '' : 'unread'}`}>
                  <button type="button" className="notif-item" onClick={() => openAnnouncement(a)}>
                    <span className="notif-ic">{k.icon}</span>
                    <span className="notif-body">
                      <span className="notif-text">{a.title}</span>
                      <span className="muted small">{k.label} · {ago(a.starts_at)}{a.ends_at && new Date(a.ends_at) < new Date() ? ' · đã kết thúc' : ''}</span>
                    </span>
                    {!seen.includes(a.id) && <i className="notif-dot" aria-label="Chưa xem" />}
                  </button>
                  <button type="button" className="notif-del" aria-label="Xóa thông báo" title="Xóa thông báo" onClick={() => hideAnnouncements([a.id])}>
                    <Icon name="trash" plain size={15} />
                  </button>
                </div>
              );
            })}
          </section>
        )}
        {sections.map((sec) => (
          <section key={sec.key}>
            <h4 className="notif-day">{sec.label}</h4>
            {sec.items.map((n) => {
              const body = (
                <>
                  <span className="notif-ic">{ICON[n.type] ?? '🔔'}</span>
                  <span className="notif-body">
                    <span className="notif-text">{n.text}</span>
                    <span className="muted small">{ago(n.created_at)}</span>
                  </span>
                  {!n.read_at && <i className="notif-dot" aria-label="Chưa đọc" />}
                </>
              );
              // a group invite waits for an answer right inside the bell
              const pendingInvite = n.type === 'group_invite' && n.ref_status === 'pending';
              return (
                <div key={n.id} className={`notif-row ${n.read_at ? '' : 'unread'}`}>
                  {n.link && !pendingInvite ? (
                    <Link to={n.link} className="notif-item" onClick={() => { openTabFor(n); if (!n.read_at) read.mutate([n.id]); }}>{body}</Link>
                  ) : (
                    <div className="notif-item">{body}</div>
                  )}
                  <button type="button" className="notif-del" aria-label="Xóa thông báo" title="Xóa thông báo" onClick={() => del.mutate(n.id)}>
                    <Icon name="trash" plain size={15} />
                  </button>
                  {pendingInvite && (
                    <div className="invite-actions">
                      <button type="button" className="btn small" disabled={respond.isPending} onClick={() => respond.mutate({ inviteId: n.ref_id, accept: true })}>Chấp nhận</button>
                      <button type="button" className="btn ghost small" disabled={respond.isPending} onClick={() => respond.mutate({ inviteId: n.ref_id, accept: false })}>Từ chối</button>
                      {respond.error && <span className="err small">{respond.error.message}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

/** An assignment notice opens its group on the assignments tab (the group page remembers its tab per group). */
function openTabFor(n) {
  const id = /^\/groups\/(\d+)/.exec(n?.link ?? '')?.[1];
  if (!id) return;
  try {
    if (n.type === 'assignment') {
      sessionStorage.setItem(`kt-group-tab-${id}`, 'tasks');
    } else if (n.type === 'group_reaction' || n.type === 'group_mention' || n.type === 'group_message') {
      sessionStorage.setItem(`kt-group-tab-${id}`, 'chat');
    }
  } catch {
    /* the group simply opens on its last tab */
  }
}

/** Bell with an unread badge, shown next to the study-streak pill. */
export default function NotificationBell() {
  const unreadNotes = useUnreadNotifications().data?.count ?? 0;
  const hiddenAnn = useHidden();
  const announcements = (useActiveAnnouncements().data ?? []).filter((a) => !hiddenAnn.includes(a.id));
  const seen = useSeen();
  const unseenAnn = announcements.filter((a) => !seen.includes(a.id)).length;
  const unread = unreadNotes + unseenAnn; // system announcements count on the badge until opened
  const [toast, setToast] = useState(null); // latest pushed notification, shown briefly under the bell

  // coming back online with unread notifications (e.g. an invite sent while away): announce the newest one once
  const list = useNotificationsQuery();
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || !list.data) return;
    announced.current = true;
    const fresh = list.data.filter((n) => !n.read_at);
    if (fresh.length === 0) return;
    setToast(fresh.length === 1 ? fresh[0] : { ...fresh[0], text: `Bạn có ${fresh.length} thông báo chưa đọc. Mới nhất: ${fresh[0].text}` });
  }, [list.data]);

  useEffect(() => {
    // chat messages are announced in the online panel, not by the bell
    const on = (e) => {
      const n = e.detail;
      if (n.type === 'group_message') return;
      setToast(n);
    };
    window.addEventListener(NOTIFICATION_EVENT, on);
    return () => window.removeEventListener(NOTIFICATION_EVENT, on);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <span className="bell-wrap">
      {toast && (
        <Link to={toast.link || '/'} className="bell-toast" onClick={() => { openTabFor(toast); setToast(null); }}>
          <span className="notif-ic">{ICON[toast.type] ?? '🔔'}</span>
          <span>{toast.text}</span>
        </Link>
      )}
      <Menu
        align="right"
        className={`bell-menu ${toast ? 'ring' : ''}`}
        label={unread > 0 ? `Thông báo (${unread} chưa đọc)` : 'Thông báo'}
        trigger={() => (
          <>
            <Icon name="bell" plain size={19} />
            {unread > 0 && <span className="notif bell-badge">{unread > 99 ? '99+' : unread}</span>}
          </>
        )}
      >
        <NotificationList unread={unreadNotes} />
      </Menu>
    </span>
  );
}
