import { useMemo, useState } from 'react';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import Bar from '@/shared/components/Bar.jsx';
import { dayLabel } from '@/shared/components/Charts.jsx';
import { fmtMinutes } from '@/shared/lib/format.js';
import Heatmap from './Heatmap.jsx';
import DayDetail from './DayDetail.jsx';
import { useStatsQuery } from './queries.js';

const RANGES = [{ d: 14, label: '14 ngày' }, { d: 30, label: '30 ngày' }, { d: 90, label: '90 ngày' }];

/** Every calendar day of the last `n` days ending at `today`, with 0 minutes where nothing was studied. */
function fillDays(heat, today, n) {
  const byDay = new Map(heat.map((h) => [h.day, Math.round(h.seconds / 60)]));
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (n - 1 - i));
    const day = d.toISOString().slice(0, 10);
    return { day, minutes: byDay.get(day) ?? 0 };
  });
}

/** Rounds a maximum up to a "nice" axis top (10, 20, 30, 45, 60, 90, 120, …). */
const niceMax = (v) => [10, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480].find((n) => n >= v) ?? Math.ceil(v / 60) * 60;

/** Sum of seven consecutive days per bar; the bar stands for the busiest day of its week. */
function toWeeks(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    const busiest = chunk.reduce((a, p) => (p.minutes > a.minutes ? p : a), chunk[0]);
    out.push({ day: busiest.day, from: chunk[0].day, to: chunk.at(-1).day, minutes: chunk.reduce((a, p) => a + p.minutes, 0), weekly: true });
  }
  return out;
}

/** Day name for the caption, e.g. "T3 03/11". */
const dayName = (iso) => {
  const { wd, dm } = dayLabel(iso);
  return `${wd} ${dm}`;
};

/**
 * Readable column chart: a caption for the picked bar, a labelled value axis with grid lines, and the
 * value written above each bar when there is room. Plain HTML, so text is never stretched.
 */
function Columns({ points, selected, onSelect, today, clickable = true }) {
  const max = niceMax(Math.max(...points.map((p) => p.minutes), 10));
  const ticks = [max, (max * 2) / 3, max / 3, 0].map((v) => Math.round(v));
  const labelled = points.length <= 16; // enough room to print the value over every bar
  const step = Math.max(1, Math.ceil(points.length / 8));
  const current = points.find((p) => p.day === selected) ?? points.at(-1);
  const caption = current.weekly ? `Tuần ${dayLabel(current.from).dm} – ${dayLabel(current.to).dm}` : `${dayName(current.day)}${current.day === today ? ' (hôm nay)' : ''}`;
  const Col = clickable ? 'button' : 'span';

  return (
    <div className="cols" role="group" aria-label="Số phút học">
      {clickable && <div className="cols-caption"><b>{current.minutes}</b> phút <span>{caption}</span></div>}
      <div className="cols-chart">
        <div className="cols-y">{ticks.map((t, i) => <span key={i}>{t}′</span>)}</div>
        <div className="cols-plot">
          {ticks.slice(0, 3).map((t, i) => <span key={i} className="cols-grid" style={{ bottom: `${(t / max) * 100}%` }} />)}
          {points.map((p) => {
            const on = clickable && p.day === current.day;
            return (
              <Col
                key={p.day} type={clickable ? 'button' : undefined} className={`col ${on ? 'on' : ''} ${p.minutes === 0 ? 'zero' : ''} ${clickable ? '' : 'static'}`}
                onClick={clickable ? () => onSelect(p.day) : undefined} aria-pressed={clickable ? on : undefined}
                title={p.weekly ? `Tuần ${dayLabel(p.from).dm} – ${dayLabel(p.to).dm}: ${p.minutes} phút` : `${dayName(p.day)}: ${p.minutes} phút`}
              >
                {(labelled || on) && p.minutes > 0 && <em>{p.minutes}</em>}
                <i style={{ height: `${Math.max(p.minutes > 0 ? 4 : 2, (p.minutes / max) * 100)}%` }} />
              </Col>
            );
          })}
        </div>
      </div>
      <div className="cols-axis">
        {points.map((p, i) => (
          <span key={p.day} className={clickable && p.day === current.day ? 'on' : ''}>{i % step === 0 || p.day === current.day ? (p.weekly ? dayLabel(p.from).dm : labelled ? dayLabel(p.day).wd : dayLabel(p.day).dm) : ''}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Full study-stats content: daily chart, heatmap, day detail and per-topic breakdown.
 * Embedded in Hồ sơ (profile) as the "Thống kê" tab; pass `userId` to show someone else's (read-only).
 */
export default function StatsSection({ userId } = {}) {
  const { data, isLoading, error } = useStatsQuery(userId);
  const [range, setRange] = useState(14);
  const [picked, setPicked] = useState(null);
  const points = useMemo(() => (data ? fillDays(data.heat, data.today, range) : []), [data, range]);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { totals, topics, streak, bestStreak, heat, today } = data;

  const total = points.reduce((a, p) => a + p.minutes, 0);
  const active = points.filter((p) => p.minutes > 0).length;
  const best = points.reduce((a, p) => (p.minutes > a.minutes ? p : a), { minutes: 0 });

  return (
    <div className="stats-section">
      <p className="muted small" style={{ margin: '0 0 12px' }}>
        {userId ? 'Lộ trình và thống kê học tập (lưu tối đa 90 ngày gần nhất).' : 'Bạn đã học bao nhiêu, ở đâu, và đều đặn đến mức nào (lưu tối đa 90 ngày gần nhất).'}
      </p>

      <div className="tiles compact">
        <div className="tile"><b>🔥 {streak}</b><span className="muted small">chuỗi hiện tại · dài nhất {bestStreak}</span></div>
        <div className="tile"><b>⭐ {totals.xp}</b><span className="muted small">tổng XP</span></div>
        <div className="tile"><b>{fmtMinutes(Math.round(totals.seconds / 60))}</b><span className="muted small">tổng thời gian học</span></div>
        <div className="tile"><b>{totals.sections_done}/{totals.sections_total}</b><span className="muted small">phiên đã đọc</span></div>
        <div className="tile"><b>{totals.basket}</b><span className="muted small">thẻ trong giỏ · {totals.mature} vững</span></div>
        <div className="tile"><b>{totals.reviews}</b><span className="muted small">lượt ôn thẻ</span></div>
      </div>

      <div className="stats-top-row" style={{ marginTop: 16 }}>
        <div className="card stats-chart">
          <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Thời gian học mỗi ngày</h3>
            <div className="tabs" style={{ margin: 0 }}>
              {RANGES.map((r) => (
                <button key={r.d} className={`tab ${range === r.d ? 'on' : ''}`} onClick={() => setRange(r.d)}>{r.label}</button>
              ))}
            </div>
          </div>
          <div className="stats-sum">
            <span><b>{fmtMinutes(total)}</b> tổng</span>
            <span><b>{Math.round(total / range)}′</b> trung bình/ngày</span>
            <span><b>{active}/{range}</b> ngày có học</span>
            {best.minutes > 0 && <span><b>{best.minutes}′</b> nhiều nhất ({dayLabel(best.day).dm})</span>}
          </div>
          <Columns points={range > 30 ? toWeeks(points) : points} selected={picked ?? today} onSelect={setPicked} today={today} clickable={!userId} />
          {!userId && (
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              {range > 30 ? 'Mỗi cột là một tuần (tổng số phút). ' : ''}Bấm vào một cột để xem {range > 30 ? 'ngày học nhiều nhất của tuần đó' : 'hôm đó'} bạn đã học gì.
            </p>
          )}
        </div>
        <Heatmap heat={heat} today={today} />
      </div>

      {!userId && (
        <>
          <DayDetail day={picked ?? today} today={today} />

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0 }}>Theo chủ đề</h3>
            <p className="muted small" style={{ margin: '2px 0 10px' }}>Thanh = phiên đã đọc; "vững" = thẻ có khoảng ôn ≥ 7 ngày.</p>
            <div className="topics-grid">
              {topics.map((t) => (
                <div key={t.slug} className="topic-tile">
                  <div className="row between small"><span>{t.title}</span><span className="muted">{t.done}/{t.sections}</span></div>
                  <Bar value={t.done} max={t.sections} label={t.title} />
                  <div className="muted small">{t.strong}/{t.basket} vững</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
