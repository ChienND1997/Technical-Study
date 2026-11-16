import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentService, toTsQuery } from './content.service.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';

function setup() {
  const saved = [];
  const contentRepo = {
    topicStats: async () => [
      { id: 1, slug: 'java', title: 'Java', parent_id: null }, { id: 2, slug: 'java-core', title: 'Core', parent_id: 1 },
    ],
    findTopic: async (s) => (s === 'java' ? { id: 1, slug: 'java', title: 'Java', parent_id: null, intro_md: 'x' } : null),
    topicLessons: async () => [{ id: 10 }],
    findLesson: async (id) => (id === 10 ? { id: 10, title: 'L', topic_id: 1, ord: 3, topic_slug: 'java' } : null),
    lessonSections: async () => [{ id: 1, ord: 0, done: false }],
    cardCounts: async () => ({ total: 4, in_basket: 1 }),
    neighbours: async () => ({ prev: null, next: { id: 11, title: 'N' } }),
    getNote: async () => null,
    search: async (ts) => [{ ts }],
    lessonIdByPath: async (p) => (p === '08/a.md' ? 10 : null),
    topicSlugByPath: async (p) => (p === '08' ? 'java' : null),
    saveNote: async (u, l, b) => (saved.push(b), { lesson_id: l, body: b }),
    deleteNote: async () => saved.push('deleted'),
  };
  return { service: createContentService({ contentRepo }), saved };
}

test('toTsQuery builds prefix terms and drops punctuation', () => {
  assert.equal(toTsQuery('dong bo, hoa!'), 'dong:* & bo:* & hoa:*');
  assert.equal(toTsQuery('  !! '), null);
});

test('listTopics nests children and hides parent_id', async () => {
  const { service } = setup();
  const [t] = await service.listTopics(1);
  assert.equal(t.children[0].slug, 'java-core');
  assert.equal('parent_id' in t, false);
});

test('getLesson returns the shape the page reads', async () => {
  const { service } = setup();
  const r = await service.getLesson(10, 1);
  assert.equal(r.cards.in_basket, 1);
  assert.deepEqual(r.next, { dir: 'next', id: 11, title: 'N' });
  assert.equal(r.prev, null);
  assert.equal(r.lesson.topic_slug, 'java');
  await assert.rejects(service.getLesson(99, 1), NotFoundError);
});

test('search validates length', async () => {
  const { service } = setup();
  await assert.rejects(service.search('a'), BadRequestError);
  assert.equal((await service.search('đồng bộ'))[0].ts, 'đồng:* & bộ:*');
});

test('resolve finds lessons, topics and fails otherwise', async () => {
  const { service } = setup();
  assert.deepEqual(await service.resolve('./08/a.md'), { to: '/lessons/10' });
  assert.deepEqual(await service.resolve('08/index.md'), { to: '/topics/java' });
  await assert.rejects(service.resolve('zzz.md'), NotFoundError);
});

test('empty note body deletes the note', async () => {
  const { service, saved } = setup();
  await service.saveNote(1, 10, '  ');
  await service.saveNote(1, 10, 'hi');
  assert.deepEqual(saved, ['deleted', 'hi']);
});
test('getTopic children carry only slug, title, description, icon and counts', async () => {
  const { service } = setup();
  const r = await service.getTopic('java', 1);
  assert.deepEqual(Object.keys(r.children[0]).sort(), ['slug', 'title']);
});
