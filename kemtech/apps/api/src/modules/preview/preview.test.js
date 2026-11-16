import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewService } from './preview.service.js';

const repo = {
  featured: async (n) => [{ id: 1, title: 'A', n }],
  lesson: async (id) => (id === 1 ? { id: 1, sections: 5 } : null),
  firstSections: async (id, n) => Array.from({ length: n }, (_, i) => ({ ord: i })),
};

test('featured passes the card limit', async () => {
  assert.equal((await createPreviewService({ previewRepo: repo }).featured())[0].n, 6);
});

test('a lesson preview is cut after two sections and flagged truncated', async () => {
  const r = await createPreviewService({ previewRepo: repo }).lesson(1);
  assert.equal(r.sections.length, 2);
  assert.equal(r.truncated, true);
});

test('an unknown lesson is a 404', async () => {
  await assert.rejects(createPreviewService({ previewRepo: repo }).lesson(9), { statusCode: 404 });
});
