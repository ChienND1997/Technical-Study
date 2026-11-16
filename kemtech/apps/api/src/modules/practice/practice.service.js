import { shuffle } from '../../common/sql.js';

const WEAK_LIMIT = 3;
const FRESH_LIMIT = 3;

/** Merges per-topic wrong counts from several sources, highest first. */
export function mergeWeak(...lists) {
  const by = new Map();
  for (const r of lists.flat()) {
    const cur = by.get(r.slug);
    by.set(r.slug, cur ? { ...cur, wrong: cur.wrong + r.wrong } : { ...r });
  }
  return [...by.values()].sort((a, b) => b.wrong - a.wrong || a.slug.localeCompare(b.slug));
}

export function createPracticeService({ practiceRepo, random = Math.random }) {
  return {
    /** Payload of GET /practice/suggestions: { teaser, weak, fresh, due, dueCount, wrongCount }. */
    async suggestions(userId) {
      const [teaser, quiz, mock, untouched, due, dueCount, wrongCount] = await Promise.all([
        practiceRepo.randomTeaser(), practiceRepo.wrongQuizByTopic(userId), practiceRepo.weakMockByTopic(userId),
        practiceRepo.untouchedTopics(userId), practiceRepo.newBasketCount(userId),
        practiceRepo.dueCount(userId), practiceRepo.wrongCount(userId),
      ]);
      const weak = mergeWeak(quiz, mock).slice(0, WEAK_LIMIT);
      const weakSlugs = new Set(weak.map((w) => w.slug));
      const fresh = shuffle(untouched.filter((t) => !weakSlugs.has(t.slug)), random).slice(0, FRESH_LIMIT);
      return { teaser, weak, fresh, due, dueCount, wrongCount };
    },
  };
}
