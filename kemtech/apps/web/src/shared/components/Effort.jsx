import { TIERS, nextTier, tierOf } from '@/shared/lib/effort.js';

/** Small pill with the effort tier reached by `minutes` studied today. `showLabel={false}` shows only the icon. */
export function EffortBadge({ minutes = 0, showLabel = true }) {
  const tier = tierOf(minutes);
  if (!tier) {
    return (
      <span className="effort-badge" style={{ '--c': 'var(--muted)' }} title={`${minutes} phút`}>
        <span aria-hidden="true">⏳</span>
        {showLabel && <b>{minutes > 0 ? `${minutes} phút` : 'Chưa bắt đầu'}</b>}
      </span>
    );
  }
  return (
    <span className="effort-badge" style={{ '--c': tier.color }} title={`${tier.label} · ${minutes} phút`}>
      <span aria-hidden="true">{tier.icon}</span>
      {showLabel && <b>{tier.label}</b>}
    </span>
  );
}

/** The four effort tiers as a ladder, lit up to the one reached, with a hint for the next step. */
export function EffortLadder({ minutes = 0 }) {
  const reached = tierOf(minutes);
  const next = nextTier(minutes);
  return (
    <div className="ladder">
      <div className="ladder-steps">
        {TIERS.map((t) => (
          <div key={t.key} className={`step ${reached && minutes >= t.minutes ? 'on' : ''}`} style={{ '--c': t.color }} title={t.desc}>
            <span className="step-ic" aria-hidden="true">{t.icon}</span>
            <b>{t.label}</b>
            <small>{t.desc}</small>
          </div>
        ))}
      </div>
      <div className="ladder-hint muted small">
        {next ? `Còn ${next.minutes - minutes} phút nữa để đạt mức "${next.label}"` : 'Bạn đã đạt mức cao nhất hôm nay!'}
      </div>
    </div>
  );
}

export default EffortBadge;
