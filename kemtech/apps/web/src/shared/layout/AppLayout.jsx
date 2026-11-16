import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import GuestHome from '@/features/auth/GuestHome.jsx';
import { setTheme, useTheme } from '@/shared/lib/theme.js';
import { FONT_SIZES, setFontSize, useFontSize } from '@/shared/lib/fontSize.js';
import { useTodayQuery } from '@/features/today/queries.js';
import { authKeys, useLogout, useMeQuery } from '@/features/auth/queries.js';
import LoginPage from '@/features/auth/LoginPage.jsx';
import GameToasts from '@/features/game/GameToasts.jsx';
import { useGameQuery } from '@/features/game/queries.js';
import Spinner from '@/shared/components/Spinner.jsx';
import { useUnreadCount } from '@/features/review/queries.js';
import { useRealtime } from '@/features/realtime/useRealtime.js';
import OnlineCard from '@/features/presence/OnlineCard.jsx';
import NotificationBell from '@/features/notifications/NotificationBell.jsx';
import { usePendingCount } from '@/features/blog/queries.js';
import Icon from '@/shared/components/Icon.jsx';
import Menu from '@/shared/components/Menu.jsx';
import Logo from '@/shared/components/Logo.jsx';
import SearchPalette, { SearchButton, useSearchShortcut } from '@/features/search/SearchPalette.jsx';
import AnnouncementPopup from '@/features/announcements/AnnouncementPopup.jsx';

const NAV = [
  { to: '/', label: 'Hôm nay', icon: 'home' },
  { to: '/tracks', label: 'Lộ trình', icon: 'map' },
  { to: '/topics', label: 'Chủ đề', icon: 'book' },
  { to: '/practice', label: 'Ôn luyện', icon: 'check', badge: 'unread' },
  { to: '/wrong', label: 'Sổ câu sai', icon: 'wrong' },
  { to: '/groups', label: 'Nhóm học', icon: 'group' },
  { to: '/blog', label: 'Blog', icon: 'blog' },
];

/** Bottom tab bar shown on phones. */
const TABS = [
  { to: '/', label: 'Hôm nay', icon: '🏠' },
  { to: '/tracks', label: 'Lộ trình', icon: '🗺️' },
  { to: '/topics', label: 'Chủ đề', icon: '📚' },
  { to: '/practice', label: 'Ôn luyện', icon: '🎯', badge: true },
  { to: '/profile', label: 'Cá nhân', icon: '👤' },
];

/** Shows the sign-in form until a session exists (unless the API runs without auth). */
export default function AppLayout() {
  const { data, isLoading } = useMeQuery();
  const qc = useQueryClient();
  // The API answers 401 when the session expires: fall back to the sign-in form.
  useEffect(() => {
    const onExpired = () => qc.setQueryData(authKeys.me, { user: null });
    window.addEventListener('kt-unauthorized', onExpired);
    return () => window.removeEventListener('kt-unauthorized', onExpired);
  }, [qc]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (isLoading) return <Spinner />;
  if (!data?.user) {
    // visitors may only see the public "Hôm nay" landing page; every other address asks them to sign in
    if (path === '/') return <GuestHome />;
    return <LoginPage locked={path !== '/login'} />;
  }
  return <Shell user={data.user} />;
}

function Shell({ user }) {
  const theme = useTheme();
  const fontSize = useFontSize();
  const { data: today } = useTodayQuery();
  const { data: game } = useGameQuery();
  const logout = useLogout();
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchShortcut(setSearchOpen);
  useRealtime(); // one WebSocket for notifications, presence and group updates
  const unread = useUnreadCount().data ?? 0; // basket cards never studied yet
  const pendingPosts = usePendingCount(!!user.isAdmin).data?.count ?? 0; // blog posts waiting for approval (admins)
  const pendingLabel = pendingPosts > 99 ? '99+' : pendingPosts;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand">
            <Logo />
          </Link>
          <nav className="nav" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === '/' }} activeProps={{ className: 'active' }} title={n.label}>
                <Icon name={n.icon} />
                <span className="nav-label">{n.label}</span>
                {n.badge && unread > 0 && <span className="notif">{unread > 99 ? '99+' : unread}</span>}
              </Link>
            ))}
            {user.isAdmin && (
              <Link to="/admin" activeProps={{ className: 'active' }} title="Quản trị">
                <Icon name="shield" />
                <span className="nav-label">Quản trị</span>
                {pendingPosts > 0 && <span className="notif">{pendingLabel}</span>}
              </Link>
            )}
          </nav>
          <div className="topbar-right">
            <SearchButton onOpen={() => setSearchOpen(true)} />
            <NotificationBell />
            {today && <span className="pill streak" title="Chuỗi ngày học liên tiếp">🔥 {today.streak}</span>}
            <Link to="/profile" search={{ tab: 'achievements' }} className="cta" title="Cấp độ và XP"><Icon name="star" size={16} plain /> Lv {game?.level ?? 1}<span className="cta-xp"> · {today?.totalXp ?? 0} XP</span></Link>
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <Menu
              align="right"
              className="user-menu"
              label="Tài khoản"
              trigger={() => (user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (user.name || '?').slice(0, 1).toUpperCase())}
            >
              <div className="menu-head"><b>{user.name}</b> {user.isAdmin && <span className="tag">admin</span>}<div className="muted small">{user.email}</div></div>
              <div className="fs-row" role="group" aria-label="Cỡ chữ">
                <span className="muted small">Cỡ chữ</span>
                <span className="fs-opts">
                  {FONT_SIZES.map((o, i) => (
                    <button key={o.key} type="button" className={fontSize === o.key ? 'on' : ''} title={o.label} aria-label={`Cỡ chữ ${o.label}`} aria-pressed={fontSize === o.key} onClick={() => setFontSize(o.key)}>
                      <span style={{ fontSize: `${0.8 + i * 0.14}rem` }}>A</span>
                    </button>
                  ))}
                </span>
              </div>
              <Link to="/profile" className="menu-item"><span className="mi"><Icon name="user" /> Hồ sơ của tôi</span></Link>
              <Link to="/profile" search={{ tab: 'stats' }} className="menu-item"><span className="mi"><Icon name="bar-chart" /> Thống kê học tập</span></Link>
              <Link to="/profile" search={{ tab: 'achievements' }} className="menu-item"><span className="mi"><Icon name="star" /> Thành tích & Level</span></Link>
              <button className="menu-item" onClick={() => logout.mutate()}><span className="mi"><Icon name="logout" /> Đăng xuất</span></button>
            </Menu>
          </div>
        </div>
      </header>
      <AnnouncementPopup />
      <main className="wrap main">
        <Outlet />
      </main>
      <OnlineCard />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <nav className="tabbar" aria-label="Điều hướng nhanh">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} activeOptions={{ exact: t.to === '/' }} activeProps={{ className: 'active' }}>
            <span className="tab-ic">{t.icon}{t.badge && unread > 0 && <i className="dot" />}</span>
            {t.label}
          </Link>
        ))}
      </nav>
      <GameToasts />
      <footer className="foot">
        <span>© {new Date().getFullYear()} KemTech. All rights reserved.</span>
      </footer>
    </div>
  );
}
