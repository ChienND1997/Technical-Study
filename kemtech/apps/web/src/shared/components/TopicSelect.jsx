import { useMemo } from 'react';
import { useTopicsQuery } from '@/features/topics/queries.js';
import Select from './Select.jsx';
import TopicIcon from './TopicIcon.jsx';

/** Topic picker: parent topics with brand logos, their children indented below. */
export default function TopicSelect({ value, onChange, allLabel = 'Tất cả chủ đề' }) {
  const { data } = useTopicsQuery();
  const options = useMemo(() => {
    const out = [{ value: '', label: allLabel, icon: <span className="sel-emoji">🌐</span> }];
    for (const t of data ?? []) {
      out.push({ value: t.slug, label: t.title, icon: <TopicIcon slug={t.slug} emoji={t.icon ?? '📘'} size={22} /> });
      for (const c of t.children ?? []) {
        out.push({ value: c.slug, label: c.title, depth: 1, icon: <TopicIcon slug={c.slug} emoji={c.icon ?? '•'} size={18} /> });
      }
    }
    return out;
  }, [data, allLabel]);
  return <Select value={value} onChange={onChange} options={options} searchable ariaLabel="Chủ đề" />;
}
