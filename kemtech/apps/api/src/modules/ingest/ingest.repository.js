/** SQL for the ingest pipeline: topics, lessons, sections, cards and day-by-day plans. Every write
 * takes `c`, the transaction client `ingest.service.js` runs the whole ingest in (`db.tx`). */
export function createIngestRepository() {
  return {
    async upsertTopic(c, { slug, path, title, description, icon, introMd, parentId, sortOrder }) {
      const { rows } = await c.query(
        `INSERT INTO topics (slug, path, title, description, icon, intro_md, parent_id, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (path) DO UPDATE SET
           slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description,
           icon = EXCLUDED.icon, intro_md = EXCLUDED.intro_md, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [slug, path, title, description, icon, introMd, parentId, sortOrder],
      );
      return rows[0].id;
    },

    async deleteTopicsNotIn(c, keepPaths) {
      await c.query('DELETE FROM topics WHERE NOT (path = ANY($1::text[]))', [keepPaths]);
    },

    async findLessonHash(c, path) {
      const { rows } = await c.query('SELECT content_hash FROM lessons WHERE path = $1', [path]);
      return rows[0]?.content_hash ?? null;
    },

    async upsertLesson(c, { topicId, path, title, kind, level, ord, wordCount, minutes, summary, hash }) {
      const { rows } = await c.query(
        `INSERT INTO lessons (topic_id, path, title, kind, level, ord, word_count, minutes, summary, content_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (path) DO UPDATE SET
           topic_id = EXCLUDED.topic_id, title = EXCLUDED.title, kind = EXCLUDED.kind, level = EXCLUDED.level,
           ord = EXCLUDED.ord, word_count = EXCLUDED.word_count, minutes = EXCLUDED.minutes,
           summary = EXCLUDED.summary, content_hash = EXCLUDED.content_hash
         RETURNING id`,
        [topicId, path, title, kind, level, ord, wordCount, minutes, summary, hash],
      );
      return rows[0].id;
    },

    async deleteLessonsNotIn(c, keepPaths) {
      await c.query('DELETE FROM lessons WHERE NOT (path = ANY($1::text[]))', [keepPaths]);
    },

    /** Replaces every section of a lesson; `search` is built here since there is no trigger for it. */
    async replaceSections(c, lessonId, sections) {
      await c.query('DELETE FROM sections WHERE lesson_id = $1', [lessonId]);
      for (const s of sections) {
        await c.query(
          `INSERT INTO sections (lesson_id, ord, heading, body_md, word_count, minutes, search)
           VALUES ($1,$2,$3,$4,$5,$6, to_tsvector('simple', unaccent($4)))`,
          [lessonId, s.ord, s.heading, s.body_md, s.word_count, s.minutes],
        );
      }
    },

    /** Replaces every review card of a lesson. */
    async replaceCards(c, lessonId, cards) {
      await c.query('DELETE FROM cards WHERE lesson_id = $1', [lessonId]);
      for (const card of cards) {
        await c.query(
          `INSERT INTO cards (lesson_id, section_ord, kind, ord, front, back, extra)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [lessonId, card.section_ord, card.kind, card.ord, card.front, card.back, card.extra ?? {}],
        );
      }
    },

    async upsertTrack(c, { slug, title, description, minutesPerDay }, sortOrder) {
      const { rows } = await c.query(
        `INSERT INTO tracks (slug, title, description, minutes_per_day, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description,
           minutes_per_day = EXCLUDED.minutes_per_day, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [slug, title, description ?? null, minutesPerDay ?? 45, sortOrder],
      );
      return rows[0].id;
    },

    /** Never deletes personal "daily-<userId>" tracks: those are generated at runtime, not from tracks.json. */
    async deleteTracksNotIn(c, keepSlugs) {
      await c.query("DELETE FROM tracks WHERE slug NOT LIKE 'daily-%' AND NOT (slug = ANY($1::text[]))", [keepSlugs]);
    },

    /**
     * One row per section of every lesson matching the topic (by slug)/kind/level filter, in reading
     * order. `ord` is the section's own ord (used by packDays to merge adjacent sections of one lesson).
     */
    async listSectionUnits(c, { topic, kinds, levels, includeUnleveled }) {
      const { rows } = await c.query(
        `SELECT l.id AS lesson_id, l.title AS lesson_title, s.ord, s.minutes
           FROM sections s
           JOIN lessons l ON l.id = s.lesson_id
           JOIN topics t ON t.id = l.topic_id
          WHERE t.slug = $1 AND l.kind = ANY($2::text[]) AND (l.level = ANY($3::int[]) OR ($4 AND l.level IS NULL))
          ORDER BY l.ord, s.ord`,
        [topic, kinds, levels, includeUnleveled],
      );
      return rows;
    },

    /** Replaces every day (and its items) of a track. `days` is `packDays()`'s output. */
    async replacePlanDays(c, trackId, days) {
      await c.query('DELETE FROM plan_days WHERE track_id = $1', [trackId]);
      for (const [i, day] of days.entries()) {
        const { rows } = await c.query(
          'INSERT INTO plan_days (track_id, day_no, title, minutes) VALUES ($1,$2,$3,$4) RETURNING id',
          [trackId, i + 1, day.title, day.minutes],
        );
        const dayId = rows[0].id;
        for (const [ord, item] of day.items.entries()) {
          await c.query(
            'INSERT INTO plan_day_items (day_id, ord, lesson_id, sec_from, sec_to) VALUES ($1,$2,$3,$4,$5)',
            [dayId, ord, item.lessonId, item.secFrom, item.secTo],
          );
        }
      }
    },
  };
}
