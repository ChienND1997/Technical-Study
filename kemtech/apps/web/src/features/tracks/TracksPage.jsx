import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { Link } from '@tanstack/react-router';
import Bar from '@/shared/components/Bar.jsx';
import { useStartTrack, useTracksQuery } from './queries.js';
import PageHero from '@/shared/components/PageHero.jsx';
import Spinner from '@/shared/components/Spinner.jsx';

export default function TracksPage() {
  const { data, isLoading, error } = useTracksQuery();
  const start = useStartTrack();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <PageHero tag="Học mỗi ngày" title={<>Lộ trình <em>theo ngày</em></>} sub="Mỗi lộ trình chia sẵn từng ngày. Bỏ lỡ một ngày cũng không sao: ngày chưa xong đầu tiên luôn là bài của hôm nay." icon="🗺️" />
      <div className="grid track-grid">
        {data.map((t) => {
          const done = t.days_done ?? 0;
          return (
            <div key={t.id} className={`card track-item ${t.active ? 'active' : ''}`}>
              <div className="ti-body">
                <div className="ti-top">
                  <h3>{t.title}</h3>
                  {t.active && <span className="live-ic" title="Đang học" aria-label="Đang học"><i /></span>}
                </div>
                <p className="ti-desc">{t.description}</p>
                <div className="ti-meta">
                  <span>📅 {t.days} ngày</span>
                  <span>⏱️ ~{t.minutes_per_day} phút/ngày</span>
                </div>
                <div className="ti-progress">
                  <Bar value={done} max={t.days} label="Tiến độ lộ trình" />
                  <small>{t.started_at ? `Đã xong ${done}/${t.days} ngày` : 'Chưa bắt đầu'}</small>
                </div>
              </div>
              <div className="ti-foot">
                {!t.active && (
                  <button className="btn-sm" disabled={start.isPending} onClick={() => start.mutate(t.id)}>
                    {t.started_at ? 'HỌC TIẾP' : 'BẮT ĐẦU'}
                  </button>
                )}
                <Link to="/tracks/$trackId" params={{ trackId: String(t.id) }} className="btn-sm ghost">XEM NGÀY</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
