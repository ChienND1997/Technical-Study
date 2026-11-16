import { useQuery } from '@tanstack/react-query';
import { fetchTopic, fetchTopics } from '@/features/topics/api.js';

export const topicsKeys = {
  all: ['topics'],
  detail: (slug) => ['topic', slug],
};

export const useTopicsQuery = () => useQuery({ queryKey: topicsKeys.all, queryFn: fetchTopics });

export const useTopicQuery = (slug) => useQuery({ queryKey: topicsKeys.detail(slug), queryFn: () => fetchTopic(slug) });

/** Flat topic list (including child topics) for <select> options; shares the topics cache entry. */
export function useTopicOptions() {
  const { data } = useTopicsQuery();
  const out = [];
  for (const t of data ?? []) {
    out.push({ slug: t.slug, title: t.title });
    for (const c of t.children ?? []) out.push({ slug: c.slug, title: `${t.title} › ${c.title}` });
  }
  return out;
}
