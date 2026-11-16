import fs from 'node:fs';
import fsp from 'node:fs/promises';
import nodePath from 'node:path';
import posix from 'node:path/posix';
import { parseDoc, rewriteLinks, sha256 } from './parse.js';
import { packDays } from './plans.js';

/**
 * Bump this when parse.js changes how files are split or how cards are built. It is mixed into the
 * content hash, which forces every lesson to be re-ingested even though its file did not change.
 * 7: Upgraded all 15 topics to professional, realistic distractors with no absurd giveaways
 */
const PARSER_VERSION = '7';

/** Top-level folders that group several topics (their sub-folders are the real topics). */
const GROUPS = new Set(['06-Distributed-Systems', '07-Interview-QA', '08-Java']);

const LEVEL_DIRS = { easy: 1, medium: 2, hard: 3 };

/** Lists every .md file under `root` as a sorted array of '/'-separated relative paths. */
function walk(root) {
  const out = [];
  const rec = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = nodePath.join(dir, e.name);
      if (e.isDirectory()) rec(p);
      else if (e.name.endsWith('.md')) out.push(nodePath.relative(root, p).split(nodePath.sep).join('/'));
    }
  };
  rec(root);
  return out.sort();
}

const stripNum = (s) => s.replace(/^\d+-/, '');
const prettify = (s) => stripNum(s).replace(/-/g, ' ');

/** URL slug of a topic directory: 'java-core', 'redis', and 'qa-backend' for children of the interview group. */
export function slugOf(topicPath) {
  const segs = topicPath.split('/');
  // spaces and odd characters become "-" so a folder like "15-System Design" still gives a clean URL
  const last = stripNum(segs[segs.length - 1]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return segs[0] === '07-Interview-QA' && segs.length === 2 ? `qa-${last}` : last;
}

/** Topic directory of a file: 'a/b/c.md' -> 'a', or 'a/b' when 'a' is a group. Null for files at the root. */
export function topicPathOf(file) {
  const segs = file.split('/');
  if (segs.length < 2) return null;
  return GROUPS.has(segs[0]) && segs.length > 2 ? `${segs[0]}/${segs[1]}` : segs[0];
}

const levelOf = (file) => LEVEL_DIRS[file.split('/').find((s) => LEVEL_DIRS[s])] ?? 0;

/**
 * Reads docs-v2 and the JSON config files and (re)builds topics, lessons, sections, cards and
 * day-by-day plans. It is idempotent: unchanged lessons are skipped, and everything runs in one
 * transaction.
 */
export function createIngestService({ db, ingestRepo, config }) {
  async function buildPlans(c, tracks, log) {
    const keep = [];
    for (const [idx, t] of tracks.entries()) {
      const trackId = await ingestRepo.upsertTrack(c, t, idx);
      keep.push(t.slug);

      const units = [];
      for (const step of t.steps) {
        const levels = step.levels ?? [null, 1, 2, 3];
        const rows = await ingestRepo.listSectionUnits(c, {
          topic: step.topic,
          kinds: step.kinds ?? ['lesson', 'guide'],
          levels: levels.filter((x) => x !== null),
          includeUnleveled: levels.includes(null),
        });
        if (!rows.length) log(`  warning: track "${t.slug}" step "${step.topic}" has no lessons`);
        for (const r of rows) units.push({ lessonId: r.lesson_id, lessonTitle: r.lesson_title, ord: r.ord, minutes: r.minutes });
      }

      const days = packDays(units, t.minutesPerDay ?? 45);
      await ingestRepo.replacePlanDays(c, trackId, days);
      log(`  track ${t.slug}: ${days.length} days (${units.length} sessions, ${Math.round(units.reduce((a, u) => a + u.minutes, 0) / 60)} hours)`);
    }
    await ingestRepo.deleteTracksNotIn(c, keep);
  }

  return {
    async run(log = console.log) {
      const lines = [];
      const record = (msg) => { lines.push(msg); log(msg); };
      const root = config.contentDir;
      if (!fs.existsSync(root)) throw new Error(`Content folder not found: ${root} (set CONTENT_DIR)`);
      const topicMeta = JSON.parse(await fsp.readFile(config.topicsFile, 'utf8'));
      const tracks = JSON.parse(await fsp.readFile(config.tracksFile, 'utf8'));

      const files = walk(root);
      const read = (f) => fs.readFileSync(nodePath.join(root, f), 'utf8');

      // 1) Work out the topic directories (and their group parents).
      const topicPaths = new Set();
      for (const f of files) {
        const tp = topicPathOf(f);
        if (!tp) continue;
        topicPaths.add(tp);
        if (tp.includes('/')) topicPaths.add(tp.split('/')[0]);
      }
      const sortedTopics = [...topicPaths].sort(); // a parent sorts before its children

      return db.tx(async (c) => {
        const topicId = new Map();
        for (const [i, tp] of sortedTopics.entries()) {
          const meta = topicMeta[tp] ?? {};
          const indexFile = `${tp}/index.md`;
          topicId.set(
            tp,
            await ingestRepo.upsertTopic(c, {
              slug: slugOf(tp),
              path: tp,
              title: meta.title ?? prettify(tp.split('/').pop()),
              description: meta.description ?? null,
              icon: meta.icon ?? null,
              introMd: files.includes(indexFile) ? rewriteLinks(read(indexFile), indexFile) : null,
              parentId: tp.includes('/') ? topicId.get(tp.split('/')[0]) : null,
              sortOrder: i,
            }),
          );
        }
        await ingestRepo.deleteTopicsNotIn(c, sortedTopics);

        // 2) Lessons. index.md files at any depth are topic introductions, not lessons.
        const lessonFiles = files.filter((f) => posix.basename(f) !== 'index.md' && topicPathOf(f));
        // Stable per-topic ordering: by level, then file name.
        lessonFiles.sort((a, b) => topicPathOf(a).localeCompare(topicPathOf(b)) || levelOf(a) - levelOf(b) || posix.basename(a).localeCompare(posix.basename(b)));

        const orderInTopic = new Map();
        let nLessons = 0, nSkipped = 0, nSections = 0, nCards = 0;
        for (const f of lessonFiles) {
          const tp = topicPathOf(f);
          const raw = read(f);
          const hash = sha256(`${PARSER_VERSION}\n${raw}`);
          const ord = orderInTopic.get(tp) ?? 0;
          orderInTopic.set(tp, ord + 1);

          const doc = parseDoc(f, raw);
          if (!doc.sections.length) continue; // empty file

          const previousHash = await ingestRepo.findLessonHash(c, f);
          const lessonId = await ingestRepo.upsertLesson(c, {
            topicId: topicId.get(tp), path: f, title: doc.title, kind: doc.kind, level: doc.level,
            ord, wordCount: doc.word_count, minutes: doc.minutes, summary: doc.summary, hash,
          });
          nLessons++;
          if (previousHash === hash) { nSkipped++; continue; } // content unchanged: keep sections and cards

          await ingestRepo.replaceSections(c, lessonId, doc.sections);
          await ingestRepo.replaceCards(c, lessonId, doc.cards);
          nSections += doc.sections.length;
          nCards += doc.cards.length;
        }
        await ingestRepo.deleteLessonsNotIn(c, lessonFiles);

        record(`ingest: ${sortedTopics.length} topics, ${nLessons} lessons (${nSkipped} unchanged), ${nSections} sections, ${nCards} cards written`);
        await buildPlans(c, tracks, record);
        return { topics: sortedTopics.length, lessons: nLessons, log: lines };
      });
    },
  };
}
