import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracksService } from './tracks.service.js';
import { NotFoundError } from '../../common/errors.js';

const days = [
  { id: 1, day_no: 1, title: 'A', minutes: 10, total: 2, done: 2, topic_title: 'Java', level: 1 },
  { id: 2, day_no: 2, title: 'B', minutes: 10, total: 2, done: 1, topic_title: 'Java', level: 1 },
  { id: 3, day_no: 3, title: 'C', minutes: 10, total: 1, done: 0, topic_title: 'Redis', level: null },
];
function setup() {
  const calls = [];
  const tracksRepo = {
    find: async (id) => (id === 1 ? { id: 1, title: 'T', active: false } : null),
    days: async () => days,
    list: async () => [{ id: 1, started_at: null, days: 3, days_done: 0 }, { id: 2, started_at: 'x', days: 3, days_done: 1 }],
    dayRow: async () => ({ id: 2, day_no: 2, title: 'B' }),
    dayItems: async () => [{ item_ord: 0, lesson_id: 5, lesson_title: 'L', topic_title: 'Java', level: 1 }],
    daySections: async () => [{ item_ord: 0, id: 9, ord: 0, heading: 'h', minutes: 4, done: true }, { item_ord: 0, id: 10, ord: 1, heading: 'h2', minutes: 6, done: false }],
    activate: async (u, t) => calls.push([u, t]),
  };
  return { service: createTracksService({ tracksRepo }), calls };
}

test('detail derives phases and the current phase', async () => {
  const { service } = setup();
  const r = await service.detail(1, 7);
  assert.equal(r.phases.length, 2);
  assert.equal(r.phases[0].status, 'current');
  assert.equal(r.phases[1].status, 'todo');
  assert.equal(r.phases[0].days_done, 1);
  assert.equal(r.days[2].topic_title, 'Redis');
  assert.equal(r.days.length, 3);
});

test('day detail aggregates sessions', async () => {
  const { service } = setup();
  const d = await service.day(1, 2, 7);
  assert.equal(d.total, 2);
  assert.equal(d.done, 1);
  assert.equal(d.minutes, 10);
  assert.equal('doneMinutes' in d, false);
  assert.equal(d.items[0].sections.length, 2);
});

test('start activates a track and rejects unknown ones', async () => {
  const { service, calls } = setup();
  await service.start(1, 7);
  assert.deepEqual(calls, [[7, 1]]);
  await assert.rejects(service.start(99, 7), NotFoundError);
});
test('list hides days_done for tracks the user has not started', async () => {
  const [a, b] = await setup().service.list(7);
  assert.equal('days_done' in a, false);
  assert.equal(b.days_done, 1);
});
