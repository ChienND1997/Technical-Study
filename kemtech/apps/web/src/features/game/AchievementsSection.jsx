import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { levelIcon } from '@/shared/lib/levels.js';
import { useGameQuery } from './queries.js';

/** Level, XP and badges. Embedded in Hồ sơ (profile) as the "Thành tích" tab, not a page of its own. */
export default function AchievementsSection() {
  const { data, isLoading, error } = useGameQuery();
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const earned = data.badges.filter((b) => b.earned).length;

  return (
    <div>
      <section className="hero level-hero">
        <div className="level-badge"><span className="level-badge-ic">{levelIcon(data.level)}</span>{data.level}</div>
        <div>
          <h2 style={{ margin: 0 }}>{data.title}</h2>
          <p style={{ margin: '2px 0 10px' }}>{data.xp} XP · còn {data.toNext} XP để lên cấp {data.level + 1}</p>
          <div className="xpbar"><i style={{ width: `${Math.round((data.into / data.span) * 100)}%` }} /></div>
        </div>
        <div className="hero-stat"><b>🔥 {data.streak}</b><span>ngày liên tiếp</span></div>
      </section>

      <h2 className="sec-title-h">Huy hiệu <span className="hint">{earned}/{data.badges.length}</span></h2>
      <div className="grid g3">
        {data.badges.map((b) => (
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
      <p className="muted small" style={{ marginTop: 16 }}>
        XP: +10 mỗi phiên học, +2 mỗi lượt ôn thẻ, +3 mỗi câu trắc nghiệm đúng, +20 mỗi buổi phỏng vấn thử.
      </p>
    </div>
  );
}
