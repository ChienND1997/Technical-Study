import { EffortBadge } from '@/shared/components/Effort.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { dayLabel } from '@/shared/components/Charts.jsx';
import LessonBlock from '@/features/today/LessonBlock.jsx';
import { useStatsDayQuery } from './queries.js';

/** What was studied on one day, laid out like the Today page but read-only. */
export default function DayDetail({ day, today, userId }) {
  const { data, isLoading, error } = useStatsDayQuery(day, userId);
  const { wd, dm } = dayLabel(day);
  const title = day === today ? 'Hôm nay' : `${wd}, ${dm}`;

  return (
    <div className="card day-detail" style={{ marginTop: 16 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{title}</h3>
        {data && <EffortBadge minutes={data.minutes} />}
      </div>
      {isLoading && <Spinner />}
      {error && <p className="err">{error.message}</p>}
      {data && (
        <>
          <div className="kpis day-kpis">
            <div className="kpi"><div><b>{data.minutes}′</b><span>phút học</span></div></div>
            <div className="kpi"><div><b>{data.sections}</b><span>phiên đã học</span></div></div>
            <div className="kpi"><div><b>{data.cards}</b><span>lượt ôn thẻ</span></div></div>
            <div className="kpi"><div><b>{data.xp}</b><span>XP</span></div></div>
          </div>
          {data.lessons.length === 0 && <div className="plan-empty">Ngày này chưa có phiên bài học nào được hoàn thành.</div>}
          {data.lessons.map((g) => <LessonBlock key={`${g.lesson_id}-${g.sections[0].id}`} g={g} defaultOpen={false} />)}
        </>
      )}
    </div>
  );
}
