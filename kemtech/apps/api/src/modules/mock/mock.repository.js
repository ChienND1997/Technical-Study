import { CARD_COLUMNS } from '../../common/sql.js';

/** Data access for mock interview sessions. */
export function createMockRepository(db) {
  return {
    async pickCards({ topic, level, n }) {
      const { rows } = await db.query(
        `SELECT ${CARD_COLUMNS}
           FROM cards c JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE c.kind = 'qa'
            AND ($1::text IS NULL
                 OR t.slug = $1
                 OR t.parent_id = (SELECT id FROM topics WHERE slug = $1)
                 OR ($1 = 'database' AND l.path ILIKE '%database%')
                 OR ($1 = 'redis' AND l.path ILIKE '%redis%')
                 OR ($1 = 'kafka' AND l.path ILIKE '%kafka%')
                 OR ($1 = 'java-concurrency' AND l.path ILIKE '%concurrency%')
                 OR ($1 = 'devops' AND l.path ILIKE '%devops%')
                 OR ($1 = 'network-security' AND l.path ILIKE '%network%')
                )
            AND ($2::int IS NULL OR l.level = $2)
          ORDER BY random() LIMIT $3`,
        [topic ?? null, level ?? null, n],
      );
      return rows;
    },

    async createSession({ userId, scope, durationSec }, exec = db) {
      const { rows } = await exec.query(
        'INSERT INTO mock_sessions (user_id, scope, duration_sec) VALUES ($1,$2,$3) RETURNING id',
        [userId, scope ?? null, durationSec],
      );
      return rows[0].id;
    },

    async insertAnswers(sessionId, answers, exec = db) {
      await exec.query(
        `INSERT INTO mock_answers (session_id, ord, card_id, score)
         SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::int[])`,
        [sessionId, answers.map((_, i) => i), answers.map((a) => a.cardId), answers.map((a) => a.score)],
      );
    },

    async listHistory(userId) {
      const { rows } = await db.query(
        `SELECT m.id, m.scope, m.started_at, m.duration_sec,
                count(a.card_id)::int AS questions,
                round(avg(a.score)::numeric, 2)::float AS avg_score
           FROM mock_sessions m JOIN mock_answers a ON a.session_id = m.id
          WHERE m.user_id = $1 GROUP BY m.id ORDER BY m.started_at DESC LIMIT 30`,
        [userId],
      );
      return rows;
    },
  };
}
