import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useLogout } from '@/features/auth/queries.js';
import GoalForm from './GoalForm.jsx';
import PasswordInput from '@/shared/components/PasswordInput.jsx';
import { useChangePassword, useProfileQuery, useSaveName } from './queries.js';
import StatsSection from '@/features/stats/StatsSection.jsx';
import AchievementsSection from '@/features/game/AchievementsSection.jsx';

const TABS = [
  { key: 'profile', label: 'Hồ sơ', icon: '👤' },
  { key: 'stats', label: 'Thống kê', icon: '📊' },
  { key: 'achievements', label: 'Thành tích', icon: '🏆' },
];

/** Change-password card: needs the current password, then the new one twice. */
function PasswordCard() {
  const change = useChangePassword();
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [done, setDone] = useState(false);
  const mismatch = f.again !== '' && f.next !== f.again;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setDone(false); };
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate({ current: f.current || undefined, next: f.next }, { onSuccess: () => { setF({ current: '', next: '', again: '' }); setDone(true); } });
      }}
    >
      <h2 style={{ margin: 0 }}>Đổi mật khẩu</h2>
      <p className="muted small" style={{ margin: 0 }}>Để trống "Mật khẩu hiện tại" nếu bạn chỉ đăng nhập bằng Google và chưa từng đặt mật khẩu.</p>
      <PasswordInput placeholder="Mật khẩu hiện tại" autoComplete="current-password" value={f.current} onChange={set('current')} />
      <PasswordInput placeholder="Mật khẩu mới (≥ 6 ký tự)" autoComplete="new-password" value={f.next} onChange={set('next')} />
      <PasswordInput placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" value={f.again} onChange={set('again')} />
      {mismatch && <p className="err small" style={{ margin: 0 }}>Hai mật khẩu mới chưa khớp.</p>}
      {change.error && <p className="err small" style={{ margin: 0 }}>{change.error.message}</p>}
      {done && <p className="small" style={{ margin: 0, color: 'var(--ok)' }}>Đã đổi mật khẩu.</p>}
      <div className="row"><button className="btn" type="submit" disabled={change.isPending || f.next.length < 6 || f.next !== f.again}>Đổi mật khẩu</button></div>
    </form>
  );
}

export default function ProfilePage() {
  const { tab } = useSearch({ strict: false });
  const { data, isLoading, error } = useProfileQuery();
  const saveName = useSaveName();
  const logout = useLogout();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (data) setName(data.user.name);
  }, [data]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { user, goal, game } = data;

  return (
    <div>
      <PageHero tag="Tài khoản" title={<>Hồ sơ <em>của tôi</em></>} sub="Thông tin cá nhân, mục tiêu học, thống kê và thành tích." icon="👤" />
      <div className="tabs cats" role="tablist">
        {TABS.map((t) => (
          <Link key={t.key} to="/profile" search={{ tab: t.key }} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'on' : ''}`}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </Link>
        ))}
      </div>

      <div className="profile-tab-panel">
      {tab === 'stats' && <StatsSection />}
      {tab === 'achievements' && <AchievementsSection />}
      {tab === 'profile' && (
        <div className="profile-grid">
          <div className="stack">
            <div className="card profile-card">
              <div className="profile-id">
                <span className="profile-avatar">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (user.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2 style={{ margin: 0 }}>{user.name} {user.isAdmin && <span className="tag">admin</span>}</h2>
                  <div className="muted small">{user.email}</div>
                  <div className="muted small">Tham gia {new Date(user.joinedAt).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveName.mutate(name, { onSuccess: () => setSaved(true) });
                }}
              >
                <label className="field" style={{ flex: 1, minWidth: 200 }}>
                  <span>Tên hiển thị</span>
                  <input type="text" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
                </label>
                <button className="btn" disabled={saveName.isPending || !name.trim() || name === user.name} style={{ alignSelf: 'flex-end' }}>Lưu tên</button>
                {saved && <span className="small" style={{ color: 'var(--ok)', alignSelf: 'flex-end' }}>Đã lưu</span>}
              </form>
            </div>

            <PasswordCard />

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Mục tiêu học</h2>
              <p className="muted small">Danh sách "Bài của hôm nay" được tính từ các bài chưa học, vừa với số phút này.</p>
              <GoalForm initial={goal} />
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="row between">
                <h3 style={{ margin: 0 }}>Cấp {game.level} · {game.title}</h3>
                <span className="tag">{game.xp} XP</span>
              </div>
              <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${Math.round((game.into / game.span) * 100)}%` }} /></div>
              <p className="muted small">🔥 {game.streak} ngày liên tiếp</p>
              <div className="badge-row">
                {game.badges.length === 0 && <span className="muted small">Chưa có huy hiệu nào.</span>}
                {game.badges.map((b) => <span key={b.id} className="badge-pill" title={b.desc}>{b.icon} {b.title}</span>)}
              </div>
              <Link to="/profile" search={{ tab: 'achievements' }} className="btn ghost" style={{ marginTop: 12 }}>Xem thành tích</Link>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Đăng xuất</h3>
              <p className="muted small">Kết thúc phiên đăng nhập trên trình duyệt này.</p>
              <button className="btn ghost" onClick={() => logout.mutate()}>Đăng xuất</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
