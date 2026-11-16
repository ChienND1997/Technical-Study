import { TIERS, tierOf } from '@/shared/lib/effort.js';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** "2026-11-03" -> { wd: "T3", dm: "03/11" } without time zone surprises. */
export function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { wd: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], dm: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}` };
}

/** Circular progress. `value` is 0..1; children are rendered in the middle. */
export function Ring({ value, size = 120, stroke = 12, color = 'var(--brand)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(v * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="ring-mid">{children}</div>
    </div>
  );
}

/** Bars of minutes per day with an optional dashed goal line; the last bar (today) is highlighted. */
export function WeekChart({ days, goal }) {
  const W = 300, H = 150, padB = 24, padT = 30;
  const max = Math.max(goal || 0, ...days.map((d) => d.minutes), 10);
  const bw = W / days.length;
  const y = (v) => padT + (H - padB - padT) * (1 - v / max);
  return (
    <svg className="week-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Số phút học 7 ngày gần nhất">
      {goal > 0 && (
        <>
          <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--warn)" strokeDasharray="4 4" strokeWidth="1.2" />
          <text x={W} y={y(goal) - 4} textAnchor="end" fontSize="9" fill="var(--warn)">mục tiêu {goal}′</text>
        </>
      )}
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        const h = Math.max(d.minutes > 0 ? 3 : 0, H - padB - y(d.minutes));
        const { wd } = dayLabel(d.day);
        return (
          <g key={d.day}>
            <rect x={i * bw + bw * 0.2} y={H - padB - h} width={bw * 0.6} height={h} rx="5" fill={isToday ? 'var(--brand)' : 'var(--brand-soft)'} stroke={isToday ? 'none' : 'var(--brand)'} strokeOpacity="0.25" />
            {d.minutes > 0 && <text x={i * bw + bw / 2} y={H - padB - h - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ink)">{d.minutes}</text>}
            {tierOf(d.minutes) && <text x={i * bw + bw / 2} y={H - padB - h - 16} textAnchor="middle" fontSize="12">{tierOf(d.minutes).icon}</text>}
            <text x={i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={isToday ? 'var(--brand)' : 'var(--muted)'} fontWeight={isToday ? 700 : 400}>{wd}</text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Line chart of minutes per day. Each point is clickable (`onSelect(day)`); dashed lines mark the effort levels.
 * points: [{ day, minutes }] in chronological order.
 */
export function LineChart({ points, selected, onSelect }) {
  const W = 760, H = 240, L = 40, R = 16, T = 18, B = 30;
  const max = Math.max(TIERS.at(-1).minutes + 20, ...points.map((p) => p.minutes));
  const x = (i) => L + (points.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.minutes).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : '';
  const step = Math.max(1, Math.ceil(points.length / 8));
  const showDots = points.length <= 62;

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Số phút học mỗi ngày">
      <defs>
        <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {TIERS.map((t) => (
        <g key={t.key}>
          <line x1={L} x2={W - R} y1={y(t.minutes)} y2={y(t.minutes)} stroke={t.color} strokeOpacity="0.5" strokeDasharray="4 5" />
          <text x={L - 6} y={y(t.minutes) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{t.minutes}′</text>
          <text x={W - R} y={y(t.minutes) - 4} textAnchor="end" fontSize="11">{t.icon}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      <path d={area} fill="url(#lcFill)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const sel = p.day === selected;
        const { dm } = dayLabel(p.day);
        return (
          <g key={p.day} onClick={() => onSelect(p.day)} style={{ cursor: 'pointer' }}>
            <rect x={x(i) - (W - L - R) / Math.max(points.length, 1) / 2} y={T} width={(W - L - R) / Math.max(points.length, 1)} height={H - T - B} fill="transparent" />
            {(showDots || sel) && <circle cx={x(i)} cy={y(p.minutes)} r={sel ? 6 : 3.5} fill={sel ? 'var(--brand)' : 'var(--card)'} stroke="var(--brand)" strokeWidth="2" />}
            {sel && <line x1={x(i)} x2={x(i)} y1={y(p.minutes) + 6} y2={y(0)} stroke="var(--brand)" strokeOpacity="0.4" strokeDasharray="3 3" />}
            {(i % step === 0 || sel) && <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fontWeight={sel ? 700 : 400} fill={sel ? 'var(--brand)' : 'var(--muted)'}>{dm}</text>}
          </g>
        );
      })}
    </svg>
  );
}
