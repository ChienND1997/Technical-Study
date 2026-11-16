import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDoc, rewriteLinks, extractSummary } from './parse.js';
import { packDays } from './plans.js';

const LESSON = `# Lý thuyết 9: Ví dụ

## Mở đầu

Đoạn mở đầu đủ dài ${'từ '.repeat(100)}

**Cốt lõi:** Đây là ý cốt lõi của bài, đủ dài để tạo thẻ ôn tập.

**Tóm tắt:**

- Ý một.
- Ý hai.

\`\`\`java
// ## not a heading
int x = 1;
\`\`\`

## Phần hai

${'nội dung '.repeat(120)}
Xem [bài khác](../hard/lt-02-x.md#a) và [web](https://example.com).
`;

test('splits sections at H2 and ignores ## inside code fences', () => {
  const d = parseDoc('01-Spring-Boot/easy/lt-09-vi-du.md', LESSON);
  assert.equal(d.title, 'Lý thuyết 9: Ví dụ');
  assert.equal(d.kind, 'lesson');
  assert.equal(d.level, 1);
  assert.deepEqual(d.sections.map((s) => s.heading), ['Mở đầu', 'Phần hai']);
});

test('extracts the summary block and builds core + summary cards', () => {
  const d = parseDoc('01-Spring-Boot/easy/lt-09-vi-du.md', LESSON);
  assert.deepEqual(d.summary, ['Ý một.', 'Ý hai.']);
  assert.deepEqual(d.cards.map((c) => c.kind).sort(), ['core', 'summary']);
});

test('rewrites relative .md links and keeps external links', () => {
  const out = rewriteLinks('[a](../hard/lt-02-x.md#a) [b](https://x.com) [c](#top)', '01-Spring-Boot/easy/lt-09.md');
  assert.match(out, /\/go\?p=01-Spring-Boot%2Fhard%2Flt-02-x\.md/);
  assert.match(out, /\(https:\/\/x\.com\)/);
  assert.match(out, /\(#top\)/);
});

const QA = `# Câu hỏi: Mẫu

## 1. \`==\` và \`equals()\`: khác gì?

**Câu hỏi:** Hai String cùng nội dung mà == lúc đúng lúc sai?

**Lập luận:** dài dòng...

**Đáp án ngắn:** == so địa chỉ, equals so nội dung.

**Nhớ:** equals cho ý nghĩa.

**Hỏi xoáy 1:** Vì sao 127 == 127 đúng?
**Lập luận:** Integer cache.

## 2. Câu hỏi nằm ở tiêu đề?

**Lập luận:** vì thế này.

**Đáp án ngắn:** trả lời ngắn.
`;

test('qa files: cards from question/answer fields, follow-ups, and questions placed in the heading', () => {
  const d = parseDoc('07-Interview-QA/Backend/easy/qa-01-x.md', QA);
  assert.equal(d.kind, 'qa');
  const qa = d.cards.filter((c) => c.kind === 'qa');
  assert.equal(qa.length, 2);
  assert.equal(qa[0].back, '== so địa chỉ, equals so nội dung.');
  assert.equal(qa[0].extra.nho, 'equals cho ý nghĩa.');
  assert.equal(qa[1].front, 'Câu hỏi nằm ở tiêu đề?');
  assert.equal(d.cards.filter((c) => c.kind === 'followup').length, 1);
  assert.equal(d.sections.length, 2); // qa sections are never merged
});

test('lessons: the interview-questions section becomes qa cards', () => {
  const md = `# Lý thuyết 1: X\n\n## Nội dung\n\n${'từ '.repeat(100)}\n\n## Câu hỏi phỏng vấn thường gặp\n\n### 1. Hỏi gì?\n\n**Câu hỏi:** Closure là gì?\n\n**Đáp án ngắn:** Hàm nhớ scope.\n\n**Nhớ:** giữ biến sống.\n\n### 2. Hỏi nữa\n\n**Câu hỏi:** Hoisting là gì?\n\n**Đáp án ngắn:** Khai báo được đưa lên đầu scope.\n`;
  const d = parseDoc('13-JavaScript/easy/lt-01-x.md', md);
  const qa = d.cards.filter((c) => c.kind === 'qa');
  assert.equal(qa.length, 2);
  assert.equal(qa[0].front, 'Closure là gì?');
  assert.equal(qa[0].extra.nho, 'giữ biến sống.');
});

test('extractSummary stops at the next paragraph', () => {
  const lines = ['**Tóm tắt:**', '', '- a', '- b', '', 'another paragraph', '- c'].map((line) => ({ line, code: false }));
  assert.deepEqual(extractSummary(lines), ['a', 'b']);
});

test('packDays: never splits a section, merges adjacent sections, respects the budget', () => {
  const u = (lessonId, ord, minutes) => ({ lessonId, lessonTitle: `L${lessonId}`, ord, minutes });
  const days = packDays([u(1, 0, 20), u(1, 1, 20), u(1, 2, 20), u(2, 0, 10), u(3, 0, 90)], 45);
  assert.equal(days.length, 3);
  assert.deepEqual(days[0].items, [{ lessonId: 1, secFrom: 0, secTo: 1 }]);
  assert.equal(days[1].items.length, 2); // last session of L1 plus L2
  assert.equal(days[2].minutes, 90); // an oversized section becomes its own day
  assert.equal(days[1].title, 'L1 (+1 bài)');
});
