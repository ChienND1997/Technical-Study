import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/shared/lib/useFocusTrap.js';
import { Link } from '@tanstack/react-router';
import { Ring, dayLabel } from '@/shared/components/Charts.jsx';
import ErrorBox from '@/shared/components/ErrorBox.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useCompleteSection } from '@/features/progress/queries.js';
import { useDashboardQuery, useGeneratePlan } from '@/features/dashboard/queries.js';
import LessonBlock from './LessonBlock.jsx';
import { EffortBadge, EffortLadder } from '@/shared/components/Effort.jsx';
import GoalForm from '@/features/profile/GoalForm.jsx';
import { HeroBanner, StreakCard, pickResume } from './TodayHero.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

const DIFF_LABEL = { mixed: 'Tự động', easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };

/** Popup to change the daily goal; closes on save, Esc or a click outside. */
function GoalModal({ goal, onClose, welcome = false }) {
  const boxRef = useRef(null);
  useFocusTrap(boxRef);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={boxRef} className="goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-title">
        <div className="row between">
          <h2 id="goal-title" style={{ margin: 0 }}>{welcome ? 'Chào mừng bạn đến KemTech 👋' : 'Cập nhật mục tiêu học'}</h2>
          <button type="button" className="ann-x" onClick={onClose} aria-label="Đóng" title="Đóng">×</button>
        </div>
        <p className="muted small" style={{ margin: '4px 0 14px' }}>{welcome ? 'Chọn thời gian học mỗi ngày và chủ đề bạn quan tâm, KemTech sẽ gợi ý bài vừa sức cho bạn. Bạn có thể đổi lại bất cứ lúc nào.' : 'Thay đổi sẽ áp dụng cho lần tạo bài kế tiếp.'}</p>
        <GoalForm initial={goal} onSaved={onClose} submitLabel="Lưu" />
      </div>
    </div>
  );
}

function Kpi({ icon, value, label, tone }) {
  return (
    <div className={`kpi ${tone ?? ''}`}>
      <span className="kpi-ic">{icon}</span>
      <div><b>{value}</b><span>{label}</span></div>
    </div>
  );
}

/** Shown until today's list is generated: goal form (or a short summary when a goal exists). */
function StartCard({ goal, generate }) {
  const [editing, setEditing] = useState(!goal);
  return (
    <div className="card start-card">
      <h2>Bắt đầu học hôm nay</h2>
      {editing ? (
        <>
          <p className="muted">Chọn mục tiêu rồi bấm bắt đầu, app sẽ chọn ngẫu nhiên những bài bạn chưa học cho vừa thời gian.</p>
          <GoalForm
            initial={goal} submitLabel="Bắt đầu học" onSaved={() => generate.mutate()}
            onSkip={() => generate.mutate()} skipLabel="Bỏ qua, chọn ngẫu nhiên"
          />
        </>
      ) : (
        <>
          <p className="muted">
            Mục tiêu của bạn: <b>{goal.dailyMinutes} phút</b> · {goal.topic ? `chủ đề ${goal.topic}` : 'mọi chủ đề'} · độ khó {DIFF_LABEL[goal.difficulty ?? 'mixed'].toLowerCase()}.
          </p>
          <div className="row">
            <button className="btn" onClick={() => generate.mutate()} disabled={generate.isPending}>Bắt đầu học</button>
            <button className="btn ghost" onClick={() => setEditing(true)}>Đổi mục tiêu</button>
          </div>
        </>
      )}
      {generate.error && <p className="err">{generate.error.message}</p>}
    </div>
  );
}

/** Where the learner is in the active track: current day, its lessons and a button to resume. */
function TrackProgress({ track, day }) {
  if (!track) {
    return (
      <div className="card tp-card">
        <h2>Lộ trình học</h2>
        <p className="muted">Bạn chưa chọn lộ trình nào. Chọn một lộ trình để theo dõi mình đang học đến đâu.</p>
        <Link to="/tracks" className="btn">Chọn lộ trình</Link>
      </div>
    );
  }
  const pct = track.days ? Math.round((track.days_done / track.days) * 100) : 0;
  const items = day?.items ?? [];
  const next = items.flatMap((it) => it.sections.map((s) => ({ it, s }))).find((x) => !x.s.done);
  return (
    <div className="card tp-card">
      <div className="plan-head">
        <div>
          <div className="muted small">Lộ trình đang học</div>
          <h2 style={{ margin: '2px 0' }}>{track.title}</h2>
        </div>
        <span className={`chip ${track.finished ? 'ok' : ''}`}>{track.finished ? '🎉 Hoàn thành' : `Ngày ${day?.day_no ?? '—'}/${track.days}`}</span>
      </div>
      <div className="plan-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      <div className="muted small">Đã xong {track.days_done}/{track.days} ngày ({pct}%)</div>
      {track.phase && (
        <div className="tp-phase">
          <span className="tp-phase-no">{track.phase.no}/{track.phases}</span>
          <div>
            <b>Giai đoạn {track.phase.no}: {track.phase.title}</b>
            <div className="muted small">Ngày {track.phase.day_from}–{track.phase.day_to} · xong {track.phase.days_done}/{track.phase.days} ngày</div>
          </div>
        </div>
      )}

      {day && (
        <div className="tp-day">
          <b>Hôm nay trong lộ trình: {day.title}</b>
          <div className="muted small">{day.done}/{day.total} phiên · khoảng {day.minutes} phút</div>
          <ul className="tp-items">
            {items.map((it) => {
              const done = it.sections.filter((s) => s.done).length;
              const first = it.sections.find((s) => !s.done) ?? it.sections[0];
              return (
                <li key={it.item_ord}>
                  <Link to="/lessons/$lessonId" params={{ lessonId: String(it.lesson_id) }} search={{ s: first.ord }}>
                    <span className={`ck ${done === it.sections.length ? 'on' : ''}`}>{done === it.sections.length ? '✓' : '○'}</span>
                    <span>{it.lesson_title}</span>
                    <small>{done}/{it.sections.length}</small>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        {next && (
          <Link to="/lessons/$lessonId" params={{ lessonId: String(next.it.lesson_id) }} search={{ s: next.s.ord }} className="btn">
            Tiếp tục lộ trình
          </Link>
        )}
        <Link to="/tracks/$trackId" params={{ trackId: String(track.id) }} className="btn ghost">Xem toàn bộ lộ trình</Link>
      </div>
    </div>
  );
}

function StudyPlan({ plan, goal, complete, generate }) {
  const allDone = plan.total > 0 && plan.done >= plan.total;
  const pct = plan.total ? Math.round((plan.done / plan.total) * 100) : 0;
  return (
    <div className="card plan">
      <div className="plan-head">
        <div>
          <h2>Bài của hôm nay</h2>
          <div className="muted small">
            {goal?.topic ? `Chủ đề: ${goal.topic}` : 'Mọi chủ đề'} · độ khó: {DIFF_LABEL[goal?.difficulty ?? 'mixed']} · chỉ gồm bài chưa học
          </div>
        </div>
        <span className={`chip ${allDone ? 'ok' : ''}`}>{allDone ? '✅ Xong danh sách' : `${plan.done}/${plan.total} phiên · ~${plan.minutes - plan.doneMinutes} phút`}</span>
      </div>
      <div className="plan-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>

      {plan.total === 0 && (
        <div className="plan-empty">Không còn bài chưa học nào khớp chủ đề và độ khó bạn chọn. Đổi mục tiêu hoặc chọn "Tất cả chủ đề".</div>
      )}
      {plan.items.map((g) => <LessonBlock key={`${g.lesson_id}-${g.sections[0].id}`} g={g} />)}

      <div className="row" style={{ marginTop: 14 }}>
        {plan.total > 0 && !allDone && (
          <Link
            to="/lessons/$lessonId" params={{ lessonId: String((plan.items.find((g) => g.sections.some((x) => !x.done)) ?? plan.items[0]).lesson_id) }}
            search={{ s: (plan.items.find((g) => g.sections.some((x) => !x.done)) ?? plan.items[0]).sections.find((x) => !x.done)?.ord }}
            className="btn"
          >
            Học tiếp
          </Link>
        )}
        <button className="btn ghost" onClick={() => generate.mutate()} disabled={generate.isPending}>{allDone ? 'Học thêm bài khác' : 'Đổi bộ bài khác'}</button>
      </div>
    </div>
  );
}

/**
 * Last 7 calendar days (today first), each with a mini effort bar so a glance shows the whole week's
 * rhythm — merges what used to be two separate cards ("Những ngày vừa qua" and the sidebar "7 ngày gần
 * đây" bar chart) into one. A day's lessons are hidden until you click it (today starts open); the full
 * history beyond 7 days lives in Hồ sơ → Thống kê instead of growing this card indefinitely.
 */
function RecentCard({ week, recent, goalMin }) {
  const byDay = new Map(recent.map((d) => [d.day, d]));
  const days = [...week].reverse(); // week is oldest→newest; show newest (today) first
  const max = Math.max(goalMin || 0, ...week.map((d) => d.minutes), 1);
  const anyMinutes = week.some((d) => d.minutes > 0);
  const [open, setOpen] = useState(() => new Set(days[0] ? [days[0].day] : []));
  const toggle = (day) => setOpen((s) => { const next = new Set(s); next.has(day) ? next.delete(day) : next.add(day); return next; });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Những ngày vừa qua</h3>
      {!anyMinutes && <p className="muted small">Chưa có phiên học nào. Hoàn thành một phiên để thấy lịch sử ở đây.</p>}
      <ol className="timeline">
        {days.map((w, i) => {
          const d = byDay.get(w.day);
          const minutes = d?.studyMinutes ?? w.minutes;
          const { wd, dm } = dayLabel(w.day);
          const pct = Math.min(100, Math.round((minutes / max) * 100));
          const isOpen = open.has(w.day);
          return (
            <li key={w.day} className={i === 0 ? 'today' : ''}>
              <div className="tl-date"><b>{wd}</b><span>{dm}</span><EffortBadge minutes={minutes} showLabel={false} /></div>
              <div className="tl-body">
                <button type="button" className="tl-bar-row tl-toggle" onClick={() => toggle(w.day)} aria-expanded={isOpen}>
                  <div className="bar tl-bar"><i style={{ width: `${pct}%` }} /></div>
                  <span className="muted small tl-min">{minutes > 0 ? `${minutes} phút` : '—'}</span>
                  <span className={`tl-caret ${isOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
                </button>
                {isOpen && (
                  d ? (
                    d.lessons.map((l) => (
                      <Link key={l.lessonId} to="/lessons/$lessonId" params={{ lessonId: String(l.lessonId) }} className="tl-lesson">
                        <span>{l.title}</span>
                        <small>{l.topic} · {l.sections} phiên</small>
                      </Link>
                    ))
                  ) : (
                    <p className="muted small tl-empty">{i === 0 ? 'Chưa học hôm nay' : 'Không học ngày này'}</p>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <Link to="/profile" search={{ tab: 'stats' }} className="link-btn tl-more">Xem đầy đủ lịch sử trong Thống kê →</Link>
    </div>
  );
}

export default function TodayPage() {
  const { data, isLoading, error } = useDashboardQuery();
  const complete = useCompleteSection();
  const generate = useGeneratePlan();
  const [editGoal, setEditGoal] = useState(false);
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return localStorage.getItem('kt-welcomed') === '1';
    } catch {
      return false;
    }
  });
  const endWelcome = () => {
    setWelcomed(true);
    try {
      localStorage.setItem('kt-welcomed', '1');
    } catch {
      /* the welcome simply shows again next time */
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} />;

  const { streak, bestStreak = streak, weekCal = [], doneToday, totalXp, reviewDue, newDue, basket, goal, plan, week, recent, topics, track, day } = data;
  const dueTotal = reviewDue + newDue;
  const goalMin = goal?.dailyMinutes ?? 30;
  const todayMin = week.at(-1).minutes; // total study time today
  const weekTotal = week.reduce((a, d) => a + d.minutes, 0);
  const prog = track && track.days ? { done: track.days_done, total: track.days } : null;

  return (
    <div className="dash">
      {editGoal && <GoalModal goal={goal} onClose={() => setEditGoal(false)} />}
      {!goal && !welcomed && !editGoal && <GoalModal welcome goal={null} onClose={endWelcome} />}

      <div className="dash-top">
        <HeroBanner
          resume={pickResume(track, day, plan)} doneToday={doneToday} streak={streak} todayMin={todayMin}
          onSuggest={plan ? () => generate.mutate() : null} suggesting={generate.isPending}
        />
        <StreakCard streak={streak} best={bestStreak} weekCal={weekCal} doneToday={doneToday} />
      </div>

      <div className="kpis">
        <Kpi icon="📖" value={`${todayMin}′`} label="phút học hôm nay" tone="orange" />
        <Kpi icon="⭐" value={totalXp} label="tổng XP" tone="amber" />
        <Kpi icon="⏱️" value={`${weekTotal}′`} label="phút học 7 ngày" tone="blue" />
        <Link to="/practice" search={{ mode: 'basket' }} style={{ textDecoration: 'none', color: 'inherit' }} title="Bấm để ôn thẻ ngay">
          <Kpi icon="🃏" value={dueTotal} label={`thẻ cần ôn · giỏ ${basket}`} tone="pink" />
        </Link>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          {track ? (
            <TrackProgress track={track} day={day} />
          ) : plan ? (
            <StudyPlan plan={plan} goal={goal} complete={complete} generate={generate} />
          ) : (
            <StartCard goal={goal} generate={generate} />
          )}
          {track && plan && (
            <StudyPlan plan={plan} goal={goal} complete={complete} generate={generate} />
          )}
          <RecentCard week={week} recent={recent} goalMin={goalMin} />
        </div>

        <aside className="dash-side">
          <div className="card goal-card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Mục tiêu hôm nay</h3>
              <button className="link-btn" onClick={() => setEditGoal((v) => !v)}>Đổi</button>
            </div>
            <div className="goal-ring">
              <Ring value={todayMin / goalMin} size={132} stroke={13}>
                <b>{todayMin}</b><span>/ {goalMin} phút</span>
              </Ring>
            </div>
            <EffortLadder minutes={todayMin} />
          </div>

          {topics.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{track ? 'Tiến độ chủ đề trong lộ trình' : 'Tiến độ theo chủ đề'}</h3>
              <div className="mastery">
                {topics.map((t) => (
                  <Link key={t.slug} to="/topics/$slug" params={{ slug: t.slug }} className="m-row">
                    <span>{t.title}</span>
                    <small>{t.done}/{t.total}</small>
                    <div className="bar"><i style={{ width: `${Math.round((t.done / t.total) * 100)}%` }} /></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
