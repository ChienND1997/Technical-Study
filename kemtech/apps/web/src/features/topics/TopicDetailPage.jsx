import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { LEVELS } from '@/shared/lib/format.js';
import Markdown from '@/shared/components/Markdown.jsx';
import Bar from '@/shared/components/Bar.jsx';
import TopicIcon from '@/shared/components/TopicIcon.jsx';
import { useTopicQuery } from './queries.js';
import Spinner from '@/shared/components/Spinner.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

export default function TopicDetailPage() {
  const { slug } = useParams({ strict: false });
  const [showIntro, setShowIntro] = useState(false);
  const { data, isLoading, error } = useTopicQuery(slug);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} />;
  const { topic, children, lessons } = data;

  // group lessons by level (null = unleveled reference material)
  const groups = [1, 2, 3, null]
    .map((lv) => ({ lv, items: lessons.filter((l) => (l.level ?? null) === lv) }))
    .filter((g) => g.items.length);

  return (
    <div>
      <p><Link to="/topics">← Chủ đề</Link></p>
      <h1>{topic.title}</h1>
      {topic.description && <p className="muted">{topic.description}</p>}

      {topic.slug !== 'blog' && topic.slug !== 'roadmap' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0 20px' }}>
          <Link
            to="/practice"
            search={{ mode: 'quiz', topic: slug }}
            className="btn"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span>🧪</span>
            <span>Trắc nghiệm ({topic.title})</span>
          </Link>
          <Link
            to="/practice"
            search={{ mode: 'mock', topic: slug }}
            className="btn ghost"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span>🎤</span>
            <span>Phỏng vấn thử ({topic.title})</span>
          </Link>
        </div>
      )}

      {topic.intro_md && (
        <div className="card">
          <button className="btn ghost" onClick={() => setShowIntro(!showIntro)}>
            {showIntro ? 'Ẩn giới thiệu' : 'Xem giới thiệu chủ đề'}
          </button>
          {showIntro && <div style={{ marginTop: 12 }}><Markdown>{topic.intro_md}</Markdown></div>}
        </div>
      )}

      {children.length > 0 && (
        <div className="grid g3" style={{ margin: '18px 0' }}>
          {children.map((c) => (
            <Link key={c.slug} to="/topics/$slug" params={{ slug: c.slug }} className="card topic-card">
              <div className="topic-body">
                <TopicIcon slug={c.slug} emoji={c.icon ?? '📘'} />
                <h3>{c.title}</h3>
                {c.description && <p>{c.description}</p>}
                <Bar value={c.done} max={c.sections} label={`Tiến độ ${c.title}`} />
              </div>
              <div className="topic-foot">
                <span className="lv"><span>{c.lessons} bài</span></span>
                <span className="btn-sm">HỌC</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {groups.map((g) => (
        <div key={String(g.lv)} className="card">
          <h3>{g.lv ? <span className={`tag l${g.lv}`}>{LEVELS[g.lv]}</span> : 'Tài liệu'} <span className="muted small">{g.items.length} bài</span></h3>
          {g.items.map((l) => (
            <Link key={l.id} to="/lessons/$lessonId" params={{ lessonId: String(l.id) }} className="lesson-link">
              <span className="t">{l.title}</span>
              <span className="muted small">{l.cards} thẻ · {l.minutes}′</span>
              <span className="tag" style={l.done >= l.sections && l.sections > 0 ? { color: 'var(--ok)' } : undefined}>
                {l.done}/{l.sections}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}