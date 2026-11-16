import { Link } from '@tanstack/react-router';
import { useMeQuery } from '@/features/auth/queries.js';
import { readLast } from '@/features/lessons/lastRead.js';
import { EffortBadge } from '@/shared/components/Effort.jsx';

const WEEK_GOAL_DAYS = 5; // days with learning per calendar week
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Where "Học tiếp" leads: the lesson opened most recently, else the next unfinished session of the
 * active track's day, else of today's list. Returns null when there is nothing to resume.
 *
 * Last-read goes first so this banner tracks whatever the learner actually just looked at, instead of
 * freezing on the track's first unfinished item the moment they browse anything outside their track —
 * "Tiếp tục lộ trình" in the track card below is the dedicated, always-correct way back into the track.
 */
export function pickResume(track, day, plan) {
  const last = readLast();
  if (last) {
    return { lessonId: last.lessonId, ord: last.ord, title: last.title, sub: 'Bài bạn đọc gần nhất' };
  }
  const trackNext = (day?.items ?? []).flatMap((it) => it.sections.map((s) => ({ it, s }))).find((x) => !x.s.done);
  if (trackNext) {
    return { lessonId: trackNext.it.lesson_id, ord: trackNext.s.ord, title: trackNext.it.lesson_title, sub: `${track?.title ?? 'Lộ trình'} · ${trackNext.s.heading}` };
  }
  const g = plan?.items.find((x) => x.sections.some((s) => !s.done));
  if (g) {
    const s = g.sections.find((x) => !x.done);
    return { lessonId: g.lesson_id, ord: s.ord, title: g.lesson_title, sub: `${g.topic_title} · ${s.heading}` };
  }
  return null;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
};

/** What the mascot says: nudges to keep the streak, or cheers when today is done. */
function mascotSays({ doneToday, streak }) {
  if (doneToday) return `Hôm nay bạn đã học rồi, giỏi lắm! Chuỗi ${streak} ngày 🎉`;
  if (streak > 0) return `Chỉ cần học một chút là giữ được chuỗi ${streak} ngày nhé!`;
  return 'Bắt đầu hôm nay nhé, chỉ cần vài phút thôi!';
}

/** Big blue banner: greeting, the lesson to continue, and the mascot. */
export function HeroBanner({ resume, doneToday, streak, todayMin, onSuggest, suggesting }) {
  const name = useMeQuery().data?.user?.name;
  return (
    <section className="hero2">
      <div className="hero2-main">
        <EffortBadge minutes={todayMin} />
        <div className="hero2-hi">{greeting()}{name ? `, ${name}` : ''} <span aria-hidden="true">👋</span></div>
        <h1>{resume ? resume.title : 'Hôm nay bạn học gì?'}</h1>
        <p className="hero2-sub">{resume ? resume.sub : 'Chọn một chủ đề hoặc lộ trình để bắt đầu.'}</p>
        <div className="hero2-actions">
          {resume ? (
            <Link to="/lessons/$lessonId" params={{ lessonId: String(resume.lessonId) }} search={resume.ord == null ? {} : { s: resume.ord }} className="btn light hero2-go">
              <span aria-hidden="true">▶</span> Học tiếp
            </Link>
          ) : (
            <Link to="/topics" className="btn light hero2-go"><span aria-hidden="true">▶</span> Chọn chủ đề</Link>
          )}
          {onSuggest ? (
            <button type="button" className="btn glass" onClick={onSuggest} disabled={suggesting}>✨ Gợi ý bài khác</button>
          ) : (
            <Link to="/topics" className="btn glass">✨ Gợi ý bài khác</Link>
          )}
        </div>
        <div className="hero2-links">
          <Link to="/practice" search={{ mode: 'quiz' }}>🧪 Trắc nghiệm</Link>
          <Link to="/practice" search={{ mode: 'wrong' }}>📕 Sổ câu sai</Link>
          <Link to="/practice" search={{ mode: 'basket' }}>🧺 Flashcard ôn tập</Link>
          <Link to="/practice" search={{ mode: 'mock' }}>🎤 Phỏng vấn thử</Link>
        </div>
      </div>
      <div className="hero2-mascot" aria-hidden="true">
        <div className="hero2-bubble">{mascotSays({ doneToday, streak })}</div>
        <div className="hero2-cat"><span className="cap">🎓</span><span className="face">🐱</span></div>
      </div>
    </section>
  );
}

/** Streak card: days in a row, best streak, this calendar week and the weekly goal. */
export function StreakCard({ streak, best, weekCal, doneToday }) {
  const done = weekCal.filter((d) => d.active).length;
  const left = Math.max(0, WEEK_GOAL_DAYS - done);
  const pct = Math.min(100, Math.round((done / WEEK_GOAL_DAYS) * 100));
  return (
    <div className="card streak-card">
      <div className="muted small streak-title">CHUỖI NGÀY HỌC</div>
      <div className="streak-main">
        <span className={`streak-flame ${streak > 0 ? 'on' : ''}`} aria-hidden="true">🔥</span>
        <div>
          <div className="streak-num"><b>{streak}</b> ngày</div>
          <div className="muted small">Dài nhất {best} ngày</div>
        </div>
      </div>

      {weekCal.length > 0 && (
      <ol className="streak-week" aria-label="Tuần này">
        {weekCal.map((d, i) => (
          <li key={d.day} className={`${d.today ? 'today' : ''} ${d.future ? 'future' : ''}`}>
            <span className="wd">{WEEKDAYS[i]}</span>
            <span className={`dot ${d.active ? 'on' : ''}`} title={`${d.day}: ${d.minutes} phút`}>
              {d.active ? (d.minutes > 0 ? d.minutes : '✓') : ''}
            </span>
          </li>
        ))}
      </ol>
      )}

      <div className="streak-goal">
        <div className="row between">
          <b>Tuần này {done}/{WEEK_GOAL_DAYS} ngày</b>
          <span className="muted small">{left > 0 ? `Còn ${left} ngày để đạt mục tiêu tuần` : 'Đã đạt mục tiêu tuần 🎉'}</span>
        </div>
        <div className="plan-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p className="muted small" style={{ margin: '8px 0 0' }}>
          {doneToday ? 'Hôm nay bạn đã giữ được chuỗi.' : 'Học một chút mỗi ngày để giữ chuỗi và tính vào tuần.'} Số trong vòng tròn là số phút đã học.
        </p>
      </div>
    </div>
  );
}
