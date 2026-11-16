import { Link, useSearch } from '@tanstack/react-router';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { levelIcon } from '@/shared/lib/levels.js';
import StatsSection from '@/features/stats/StatsSection.jsx';
import { usePublicProfileQuery } from './queries.js';

const CHIP_LIMIT = 14;
const TABS = [
  { key: 'stats', label: 'Lộ trình & thống kê', icon: '📊' },
  { key: 'achievements', label: 'Thành tích', icon: '🏆' },
];

/** Read-only profile of another user: identity, level/XP, badges, plus their study path and stats. */
export default function UserProfilePage({ userId }) {
  const { tab } = useSearch({ strict: false });
  const { data, isLoading, error } = usePublicProfileQuery(userId);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { user, game } = data;
  const earned = game.badges.filter((b) => b.earned).length;
  const sorted = [...game.badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  const chips = sorted.slice(0, CHIP_LIMIT);
  const hasMore = game.badges.length > CHIP_LIMIT;

  const tabLink = (key) => ({ to: '/users/$userId', params: { userId: String(userId) }, search: { tab: key } });

  return (
    <div>
      <section className="hero level-hero profile-hero">
        <span className="profile-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (user.name || '?').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1>
            {user.name}
            <span className="level-chip" title={`Cấp ${game.level}`}>{levelIcon(game.level)}</span>
            {user.isAdmin && <span className="tag">admin</span>}
            {!user.active && <span className="tag">đã khóa</span>}
          </h1>
          <p>Cấp {game.level} · {game.title} · {game.xp} XP</p>
          <div className="xpbar"><i style={{ width: `${Math.round((game.into / game.span) * 100)}%` }} /></div>
        </div>
        <div className="hero-stat"><b>🔥 {game.streak}</b><span>ngày liên tiếp</span></div>
      </section>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row between">
          <span className="muted small">📅 Tham gia {new Date(user.joinedAt).toLocaleDateString('vi-VN')}</span>
          <span className="muted small">{earned}/{game.badges.length} huy hiệu</span>
        </div>
        <div className="badge-strip">
          {chips.map((b) => (
            <span key={b.id} className={`badge-chip ${b.earned ? '' : 'locked'}`} title={`${b.title} — ${b.desc}`}>{b.icon}</span>
          ))}
        </div>
        {hasMore && (
          <Link {...tabLink('achievements')} className="link-btn" style={{ marginTop: 8 }}>
            Xem tất cả {game.badges.length} huy hiệu
          </Link>
        )}
      </div>

      <div className="tabs cats" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <Link key={t.key} {...tabLink(t.key)} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'on' : ''}`}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </Link>
        ))}
      </div>

      <div className="profile-tab-panel">
        {tab === 'achievements' ? (
          <div className="grid g3">
            {game.badges.map((b) => (
              <div key={b.id} className={`card badge-card ${b.earned ? '' : 'locked'}`} style={{ marginTop: 0 }}>
                <span className="badge-ic">{b.icon}</span>
                <div>
                  <b>{b.title}</b>
                  <div className="muted small">{b.desc}</div>
                  {b.earned && b.earnedAt && <div className="small" style={{ color: 'var(--ok)' }}>Đạt {new Date(b.earnedAt).toLocaleDateString('vi-VN')}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StatsSection userId={userId} />
        )}
      </div>
    </div>
  );
}
