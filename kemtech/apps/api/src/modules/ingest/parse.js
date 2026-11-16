import path from 'node:path/posix';
import crypto from 'node:crypto';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const LEVELS = { easy: 1, medium: 2, hard: 3 };
const WPM = 200; // reading speed for technical text, words per minute
const MIN_SECTION_WORDS = 80; // shorter sections are merged so a study session is worth opening

export function countWords(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Estimated reading time in minutes: words / 200 plus 0.7 minute per code block, at least 1. */
export function estimateMinutes(text) {
  const blocks = (text.match(/^```/gm) || []).length / 2;
  return Math.max(1, Math.round(countWords(text) / WPM + blocks * 0.7));
}

/**
 * Splits text into lines tagged with an "inside a code fence" flag, so a `## ` or `**Field:**`
 * line inside a code block is never mistaken for markdown structure.
 */
function tagLines(text) {
  let inFence = false;
  return text.replace(/\r\n/g, '\n').split('\n').map((line) => {
    const isFence = /^\s*```/.test(line);
    const tagged = { line, code: inFence || isFence };
    if (isFence) inFence = !inFence;
    return tagged;
  });
}

/** 1/2/3 for easy/medium/hard folders in the path, null when the file is not inside a level folder. */
export function parseLevel(relPath) {
  for (const seg of relPath.split('/')) if (LEVELS[seg]) return LEVELS[seg];
  return null;
}

/** qa-* files are interview Q&A, quiz-* are multiple choice tests, lt-* are lessons, anything else is a guide. */
export function kindOf(relPath) {
  const base = path.basename(relPath);
  if (base.startsWith('quiz-')) return 'quiz';
  if (base.startsWith('qa-')) return 'qa';
  if (base.startsWith('lt-')) return 'lesson';
  return 'guide';
}

/**
 * Rewrites relative links to .md files into `/go?p=<path inside docs-v2>` so the frontend can
 * resolve them to the right page. External links (http, mailto, #anchor) are left untouched.
 */
export function rewriteLinks(md, relPath) {
  const dir = path.dirname(relPath);
  return tagLines(md)
    .map(({ line, code }) => {
      if (code) return line;
      return line.replace(/\]\(([^)\s]+)\)/g, (m, target) => {
        if (/^(https?:|mailto:|#|\/)/.test(target)) return m;
        const [p] = target.split('#');
        if (!p.endsWith('.md')) return m;
        let decoded = p;
        try { decoded = decodeURIComponent(p); } catch { /* keep the raw value */ }
        const abs = path.normalize(path.join(dir, decoded));
        return `](/go?p=${encodeURIComponent(abs)})`;
      });
    })
    .join('\n');
}

/**
 * Parses one markdown file into: title, sections (split at H2), the "Tóm tắt" summary block
 * and the review cards derived from it.
 */
export function parseDoc(relPath, rawText) {
  const kind = kindOf(relPath);
  const lines = tagLines(rawText);

  // Title is the first H1 outside code.
  let title = null;
  const bodyLines = [];
  for (const l of lines) {
    if (title === null && !l.code && /^# /.test(l.line)) {
      title = l.line.replace(/^#\s+/, '').trim();
      continue;
    }
    bodyLines.push(l);
  }
  if (!title) title = path.basename(relPath, '.md');

  // Split into sections at H2; text before the first H2 becomes the "Tổng quan" (overview) section.
  const sections = [];
  let cur = { heading: 'Tổng quan', lines: [] };
  for (const l of bodyLines) {
    if (!l.code && /^## /.test(l.line)) {
      sections.push(cur);
      cur = { heading: l.line.replace(/^##\s+/, '').trim(), lines: [] };
    } else {
      cur.lines.push(l.line);
    }
  }
  sections.push(cur);

  let secs = sections
    .map((s) => ({ heading: s.heading, body: s.lines.join('\n').trim() }))
    .filter((s) => s.body.length > 0);

  // Merge very short sections into the previous one. qa-* and quiz-* files are exempt because every
  // section is a separate question, and so is the interview-questions or quiz section of a lesson.
  if (kind !== 'qa' && kind !== 'quiz') {
    const merged = [];
    for (const s of secs) {
      const prev = merged[merged.length - 1];
      if (prev && countWords(s.body) < MIN_SECTION_WORDS && !/^(?:Câu hỏi phỏng vấn|Trắc nghiệm)/i.test(s.heading)) {
        prev.body += `\n\n## ${s.heading}\n\n${s.body}`;
      } else {
        merged.push({ ...s });
      }
    }
    // A too-short first section is folded into the second one instead.
    if (merged.length > 1 && countWords(merged[0].body) < MIN_SECTION_WORDS) {
      const [first, second, ...rest] = merged;
      merged.splice(0, merged.length, { heading: first.heading, body: `${first.body}\n\n## ${second.heading}\n\n${second.body}` }, ...rest);
    }
    secs = merged;
  }

  const full = secs.map((s) => s.body).join('\n');
  const summary = extractSummary(lines).map((x) => rewriteLinks(x, relPath));
  const rawCards = buildCards(kind, secs, title);
  if (kind !== 'qa' && kind !== 'quiz') {
    const sc = summaryCard(title, summary);
    if (sc) rawCards.push(sc);
  }
  // Relative links inside card text must be rewritten as well.
  const cards = rawCards.map((c) => ({
    ...c,
    front: rewriteLinks(c.front, relPath),
    back: rewriteLinks(c.back, relPath),
    extra: {
      ...(c.extra || {}),
      ...(c.extra?.nho ? { nho: rewriteLinks(c.extra.nho, relPath) } : {}),
      ...(c.extra?.explanation ? { explanation: rewriteLinks(c.extra.explanation, relPath) } : {}),
    },
  }));
  return {
    title,
    kind,
    level: parseLevel(relPath),
    sections: secs.map((s, i) => ({
      ord: i,
      heading: s.heading,
      body_md: rewriteLinks(s.body, relPath),
      word_count: countWords(s.body),
      minutes: estimateMinutes(s.body),
    })),
    summary,
    cards,
    word_count: countWords(full),
    minutes: estimateMinutes(full),
  };
}

/** Collects the bullets that follow the standalone `**Tóm tắt:**` line. */
export function extractSummary(lines) {
  const out = [];
  let started = false;
  for (const { line, code } of lines) {
    if (code) { if (started) break; continue; }
    if (!started) {
      if (/^\*\*Tóm tắt:?\*\*:?\s*$/.test(line.trim())) started = true;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) out.push(line.replace(/^\s*[-*]\s+/, '').trim());
    else if (line.trim() === '' && out.length === 0) continue;
    else if (line.trim() === '') { /* blank line between bullets */ }
    else break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Review cards
// ---------------------------------------------------------------------------

const FIELD = /^\s*\*+([^*:]+?):?\*+:?\s*(.*)$/;

/** Splits a section into `**Name:** text` fields; the text may span several lines, including code blocks. */
export function parseFields(body) {
  const fields = [];
  let cur = null;
  for (const { line, code } of tagLines(body)) {
    const m = !code && line.match(FIELD);
    if (m) {
      cur = { name: m[1].trim(), text: m[2] };
      fields.push(cur);
    } else if (cur) {
      cur.text += `\n${line}`;
    }
  }
  for (const f of fields) f.text = f.text.trim();
  return fields;
}

/** Splits text at `### ` headings (ignoring headings inside code blocks); the text before the first one is dropped. */
function splitH3(body) {
  const blocks = [];
  let cur = null;
  for (const { line, code } of tagLines(body)) {
    if (!code && /^### /.test(line)) {
      cur = [];
      blocks.push(cur);
    } else if (cur) cur.push(line);
  }
  return blocks.map((b) => b.join('\n'));
}

/** Extracts interview questions from lesson interview sections (both ### and numbered lists 1., 2.). */
export function extractLessonInterviewQuestions(body) {
  const results = [];
  for (const block of splitH3(body)) {
    const f = parseFields(block);
    const q = f.find((x) => x.name === 'Câu hỏi')?.text;
    const a = f.find((x) => x.name === 'Đáp án ngắn')?.text;
    const nho = f.find((x) => x.name === 'Nhớ')?.text;
    if (q && a) results.push({ q, a, nho });
  }

  const lines = tagLines(body);
  const numbered = [];
  let cur = null;
  for (const { line, code } of lines) {
    if (!code) {
      const m = line.match(/^\s*(?:###\s+)?(\d+)\.\s+(.+)$/);
      if (m && !/^\s*\d+\.\s*(?:https?:|\/|```)/.test(line)) {
        cur = { q: m[2].trim(), lines: [] };
        numbered.push(cur);
        continue;
      }
    }
    if (cur) cur.lines.push(line);
  }

  for (const item of numbered) {
    const f = parseFields(item.lines.join('\n'));
    const q = f.find((x) => x.name === 'Câu hỏi')?.text || item.q;
    const a = f.find((x) => x.name === 'Đáp án ngắn')?.text;
    const nho = f.find((x) => x.name === 'Nhớ')?.text;
    if (q && a && !results.some((r) => r.q === q)) {
      results.push({ q, a, nho });
    }
  }
  return results;
}

/**
 * A qa section holds either one question (the H2 itself, "1. Question?") or several
 * (bold lines such as "**3. Question?**"). Returns a list of { question, body }.
 */
export function splitQuestions(sec) {
  const lines = tagLines(sec.body);
  const starts = [];
  lines.forEach((l, i) => {
    const m = !l.code && l.line.match(/^\*\*\d+\.\s+(.+?)\*\*\s*$/);
    if (m) starts.push({ i, question: m[1].trim() });
  });
  if (starts.length) {
    return starts.map((s, k) => ({
      question: s.question,
      body: lines.slice(s.i + 1, k + 1 < starts.length ? starts[k + 1].i : undefined).map((l) => l.line).join('\n'),
    }));
  }
  // The heading itself is the question when it is numbered ("12. ...") or contains a question mark.
  const heading = sec.heading.replace(/^\d+\.\s*/, '').trim();
  const isQuestion = /^\d+\./.test(sec.heading) || sec.heading.includes('?');
  return [{ question: isQuestion ? heading : '', body: sec.body }];
}

/** Extracts multiple choice questions from quiz files or quiz sections. */
export function extractMultipleChoiceQuestions(body, defaultHeading = '') {
  const blocks = [];
  const lines = tagLines(body);
  let cur = null;

  for (const { line, code } of lines) {
    if (!code) {
      const h3Match = line.match(/^###\s+(.+)$/);
      const numMatch = line.match(/^\s*(?:(?:\*\*)?(?:Câu\s+)?(\d+)[:.]\s*(.+?)(?:\*\*)?)$/i);
      if (h3Match) {
        if (cur) blocks.push(cur);
        cur = { heading: h3Match[1].trim(), lines: [] };
        continue;
      } else if (numMatch && !cur) {
        cur = { heading: numMatch[2] ? numMatch[2].trim() : line.trim(), lines: [] };
        continue;
      }
    }
    if (cur) cur.lines.push(line);
    else if (line.trim().length > 0) {
      cur = { heading: defaultHeading, lines: [line] };
    }
  }
  if (cur) blocks.push(cur);

  const results = [];
  for (const block of blocks) {
    const qLines = block.lines;
    const fields = parseFields(qLines.join('\n'));
    let q = fields.find((f) => f.name === 'Câu hỏi')?.text;
    if (!q) {
      q = block.heading.replace(/^(?:Câu\s+\d+[:.]\s*|\d+[:.]\s*)/i, '').trim();
    }
    if (!q) continue;

    const options = [];
    let correctLetter = null;
    let explanation = fields.find((f) => /^(?:Giải thích|Vì sao|Lập luận)$/i.test(f.name))?.text || '';

    // Check if **Đáp án:** B is present
    const ansField = fields.find((f) => /^(?:Đáp án|Đáp án đúng)$/i.test(f.name));
    if (ansField) {
      const m = ansField.text.match(/([A-D])/i);
      if (m) correctLetter = m[1].toUpperCase();
    }

    for (const rawLine of qLines) {
      const l = rawLine.trim();
      // Checkbox format: - [x] or - [ ] or * [x]
      const cbMatch = l.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (cbMatch) {
        const isCorrect = cbMatch[1].toLowerCase() === 'x';
        let text = cbMatch[2].trim();
        options.push({ text, correct: isCorrect });
        continue;
      }
      // Letter format: - A. or * A. or A.
      const letMatch = l.match(/^[-*]?\s*([A-D])[\.\)]\s*(.*)$/i);
      if (letMatch) {
        const letter = letMatch[1].toUpperCase();
        let text = letMatch[2].trim();
        let isCorrect = false;
        if (/\((?:đúng|chính xác|correct)\)$/i.test(text)) {
          isCorrect = true;
          text = text.replace(/\s*\((?:đúng|chính xác|correct)\)$/i, '').trim();
        }
        if (correctLetter && letter === correctLetter) {
          isCorrect = true;
        }
        options.push({ letter, text, correct: isCorrect });
        continue;
      }
      // Blockquote explanation: > **Giải thích:** ...
      const bqExp = l.match(/^>\s*\*+(?:Giải thích|Lập luận):?\*+:?\s*(.*)$/i);
      if (bqExp && !explanation) {
        explanation = bqExp[1].trim();
      }
    }

    if (options.length >= 2) {
      const correctOpt = options.find((o) => o.correct) || options[0];
      results.push({
        question: q,
        back: correctOpt.text,
        options: options.map((o) => ({ text: o.text, correct: !!o.correct })),
        explanation: explanation || null,
      });
    }
  }
  return results;
}

/** Truncates at a word boundary and appends an ellipsis. */
const clip = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);

function buildCards(kind, secs, title = '') {
  const cards = [];
  const counters = { qa: 0, followup: 0, core: 0, quiz: 0 };
  secs.forEach((sec, secIdx) => {
    if (kind === 'quiz') {
      const mcqs = extractMultipleChoiceQuestions(sec.body, sec.heading);
      for (const mcq of mcqs) {
        cards.push({
          section_ord: secIdx, kind: 'quiz', ord: counters.quiz++,
          front: mcq.question, back: mcq.back,
          extra: { options: mcq.options, ...(mcq.explanation ? { explanation: mcq.explanation } : {}) },
        });
      }
    } else if (kind === 'qa') {
      for (const block of splitQuestions(sec)) {
        const fields = parseFields(block.body);
        const q = fields.find((f) => f.name === 'Câu hỏi')?.text || block.question;
        const a = fields.find((f) => f.name === 'Đáp án ngắn');
        const reason = fields.find((f) => f.name === 'Lập luận');
        const nho = fields.find((f) => f.name === 'Nhớ');
        // Fall back to the reasoning when a question has no short answer.
        const back = a?.text || (reason ? clip(reason.text, 700) : '');
        if (q && back) {
          cards.push({
            section_ord: secIdx, kind: 'qa', ord: counters.qa++,
            front: q, back,
            extra: nho ? { nho: nho.text } : {},
          });
        }
        // Follow-up question N: its answer is the "Lập luận" or "Đáp" field right after it.
        fields.forEach((f, i) => {
          if (!/^Hỏi xoáy/.test(f.name) || !f.text) return;
          const ans = fields.slice(i + 1).find((x) => x.name === 'Lập luận' || x.name === 'Đáp');
          if (ans?.text) {
            cards.push({
              section_ord: secIdx, kind: 'followup', ord: counters.followup++,
              front: f.text, back: clip(ans.text, 900), extra: {},
            });
          }
        });
      }
    } else {
      // Check for multiple-choice quiz section in a lesson
      if (/^Trắc nghiệm/i.test(sec.heading)) {
        const mcqs = extractMultipleChoiceQuestions(sec.body, sec.heading);
        for (const mcq of mcqs) {
          cards.push({
            section_ord: secIdx, kind: 'quiz', ord: counters.quiz++,
            front: mcq.question, back: mcq.back,
            extra: { options: mcq.options, ...(mcq.explanation ? { explanation: mcq.explanation } : {}) },
          });
        }
      }
      // A lesson may end with an interview-questions section; each question becomes a high-value Q&A card.
      if (/^Câu hỏi phỏng vấn/i.test(sec.heading)) {
        for (const { q, a, nho } of extractLessonInterviewQuestions(sec.body)) {
          cards.push({
            section_ord: secIdx, kind: 'qa', ord: counters.qa++,
            front: q, back: a,
            extra: nho ? { nho } : {},
          });
        }
      }
      const fields = parseFields(sec.body);
      const core = fields.find((f) => f.name === 'Cốt lõi');
      if (core?.text && core.text.length > 40) {
        // Cut at the first blank line so only the core paragraph is used, not the bullets after it.
        const para = core.text.split(/\n\s*\n/)[0].trim();
        const heading = sec.heading.trim();
        const isGeneric = /^(Tổng quan|Mở đầu|Vấn đề|Khi nào dùng|Khái niệm|Mô hình tư duy)/i.test(heading);
        const front = isGeneric
          ? (title ? `Ý cốt lõi của bài "${title}" là gì?` : `${heading}: ý cốt lõi là gì?`)
          : (title ? `${title} - ${heading}: ý cốt lõi là gì?` : `${heading}: ý cốt lõi là gì?`);
        cards.push({
          section_ord: secIdx, kind: 'core', ord: counters.core++,
          front, back: para, extra: {},
        });
      }
    }
  });
  return cards;
}

/** One "summary" card holding the whole summary block; created once the title is known. */
export function summaryCard(title, summary) {
  if (summary.length < 2) return null;
  return {
    section_ord: 0, kind: 'summary', ord: 0,
    front: `${title}: nêu các ý chính`,
    back: summary.map((s) => `- ${s}`).join('\n'),
    extra: {},
  };
}
