const WEEKS = 13; // about the 90 days of history that are kept
const WEEKDAY_LABELS = ['T2', '', 'T4', '', 'T6', '', '']; // Mon / Wed / Fri, like a GitHub contribution graph
const MONTHS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

/** Builds WEEKS columns of 7 days ending today, plus a month label per column where the month changes. */
function buildHeat(heat, today) {
  const map = new Map(heat.map((h) => [h.day, h]));
  const end = new Date(`${today}T00:00:00Z`);
  const dow = (end.getUTCDay() + 6) % 7; // Monday = 0
  const cells = [];
  const totalDays = WEEKS * 7 - (6 - dow);
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const h = map.get(iso);
    const score = h ? h.cards_reviewed + h.sections_done * 5 + h.seconds / 120 : 0;
    cells.push({ iso, level: score === 0 ? '' : score < 10 ? 'a' : score < 30 ? 'b' : 'c', h });
  }
  // Pad the start so the first cell lands in the row matching its weekday.
  const firstDow = (new Date(`${cells[0].iso}T00:00:00Z`).getUTCDay() + 6) % 7;
  const padded = [...Array.from({ length: firstDow }, () => null), ...cells];

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  let lastMonth = -1;
  const monthLabels = weeks.map((w) => {
    const first = w.find(Boolean);
    if (!first) return '';
    const m = new Date(`${first.iso}T00:00:00Z`).getUTCMonth();
    if (m === lastMonth) return '';
    lastMonth = m;
    return MONTHS[m];
  });
  return { weeks, monthLabels };
}

export default function Heatmap({ heat, today }) {
  const { weeks, monthLabels } = buildHeat(heat, today);
  const activeDays = heat.filter((h) => h.cards_reviewed > 0 || h.sections_done > 0 || h.seconds > 0).length;
  return (
    <div className="card heat-card">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Hoạt động {WEEKS} tuần</h3>
        <span className="muted small">{activeDays} ngày có học</span>
      </div>
      <div className="heat-scroll">
        <div className="heat-months">{monthLabels.map((m, i) => <span key={i}>{m}</span>)}</div>
        <div className="heat-row">
          <div className="heat-days">{WEEKDAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="heat" aria-label="Bản đồ nhiệt hoạt động">
            {weeks.map((w, wi) => (
              <div key={wi} className="heat-col">
                {w.map((c, ci) =>
                  c ? (
                    <i key={c.iso} className={c.level} title={`${c.iso}: ${c.h ? `${c.h.cards_reviewed} thẻ, ${c.h.sections_done} phiên` : 'không học'}`} />
                  ) : (
                    <i key={`pad-${wi}-${ci}`} style={{ visibility: 'hidden' }} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heat-legend muted small">
        Ít <span className="heat-sw" /><span className="heat-sw a" /><span className="heat-sw b" /><span className="heat-sw c" /> Nhiều
      </div>
    </div>
  );
}
