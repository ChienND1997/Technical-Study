import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeService, mergeWeak } from './practice.service.js';

test('mergeWeak sums sources and sorts by wrong count', () => {
  const m = mergeWeak([{ slug: 'a', wrong: 2 }, { slug: 'b', wrong: 1 }], [{ slug: 'b', wrong: 3 }]);
  assert.deepEqual(m.map((x) => [x.slug, x.wrong]), [['b', 4], ['a', 2]]);
});

test('suggestions: caps weak, excludes weak topics from fresh', async () => {
  const t = (slug, wrong) => ({ slug, title: slug, icon: null, wrong, cards: 5 });
  const repo = {
    randomTeaser: async () => ({ id: 1, front: 'q', back: 'a' }),
    wrongQuizByTopic: async () => [t('a', 5), t('b', 4), t('c', 3), t('d', 2)],
    weakMockByTopic: async () => [t('e', 1)],
    untouchedTopics: async () => ['a', 'x', 'y', 'z', 'w'].map((s) => t(s, 0)),
    newBasketCount: async () => 7,
    dueCount: async () => 12,
    wrongCount: async () => 4,
  };
  const r = await createPracticeService({ practiceRepo: repo, random: () => 0.5 }).suggestions(1);
  assert.deepEqual(r.weak.map((w) => w.slug), ['a', 'b', 'c']);
  assert.equal(r.fresh.length, 3);
  assert.ok(!r.fresh.some((f) => f.slug === 'a'));
  assert.equal(r.due, 7);
  assert.equal(r.dueCount, 12);
  assert.equal(r.wrongCount, 4);
  assert.equal(r.teaser.id, 1);
});
