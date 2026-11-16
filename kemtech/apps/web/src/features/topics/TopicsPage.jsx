import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import PageHero from '@/shared/components/PageHero.jsx';
import Bar from '@/shared/components/Bar.jsx';
import { useTopicsQuery } from './queries.js';
import TopicIcon from '@/shared/components/TopicIcon.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

/** Tab -> topic slugs. A topic not listed anywhere only shows up under "Tất cả". */
const GROUPS = [
  { key: 'all', label: 'Tất cả', slugs: null },
  { key: 'backend', label: 'Backend', slugs: ['java', 'spring-boot'] },
  { key: 'database', label: 'Database', slugs: ['database'] },
  { key: 'devops', label: 'DevOps', slugs: ['devops'] },
  { key: 'network', label: 'Network', slugs: ['network-security'] },
  { key: 'system', label: 'Hệ thống', slugs: ['distributed-systems', 'system-design'] },
  { key: 'algo', label: 'Thuật toán', slugs: ['algorithms'] },
  { key: 'frontend', label: 'Frontend', slugs: ['html', 'css', 'javascript', 'react', 'vue', 'frontend-core', 'fullstack'] },
  { key: 'interview', label: 'Phỏng vấn', slugs: ['interview-qa'] },
  { key: 'roadmap', label: 'Định hướng', slugs: ['roadmap'] },
];

function TopicCard({ t }) {
  return (
    <Link to="/topics/$slug" params={{ slug: t.slug }} className="card topic-card">
      <div className="topic-body">
        <TopicIcon slug={t.slug} emoji={t.icon ?? '📘'} />
        <h3>{t.title}</h3>
        {t.description && <p>{t.description}</p>}
        <Bar value={t.done} max={t.sections} label={`Tiến độ ${t.title}`} />
      </div>
      <div className="topic-foot">
        <span className="lv">
        {t.easy > 0 && <span className="e">E {t.easy}</span>}
        {t.medium > 0 && <span className="m">M {t.medium}</span>}
        {t.hard > 0 && <span className="h">H {t.hard}</span>}
        {!t.easy && !t.medium && !t.hard && <span>{t.lessons} bài</span>}
        </span>
        <span className="btn-sm">HỌC</span>
      </div>
    </Link>
  );
}

export default function TopicsPage() {
  const { data, isLoading, error } = useTopicsQuery();
  const [tab, setTab] = useState('all');
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} />;

  const group = GROUPS.find((g) => g.key === tab);
  const shown = group.slugs ? data.filter((t) => group.slugs.includes(t.slug)) : data;

  return (
    <div>
      <PageHero tag="Thư viện kiến thức" title={<>Học theo <em>chủ đề</em></>} sub={`${data.length} mảng · mỗi mảng chia Easy / Medium / Hard`} icon="📚" />
      <div className="tabs cats" role="tablist">
        {GROUPS.filter((g) => !g.slugs || data.some((t) => g.slugs.includes(t.slug))).map((g) => (
          <button key={g.key} role="tab" aria-selected={tab === g.key} className={`tab ${tab === g.key ? 'on' : ''}`} onClick={() => setTab(g.key)}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid g3">
        {shown.map((t) => (
          <TopicCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}