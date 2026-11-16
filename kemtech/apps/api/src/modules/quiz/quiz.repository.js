import { CARD_COLUMNS } from '../../common/sql.js';

/** Data access for multiple-choice quizzes built from Q&A cards, and the wrong-answer notebook. */
export function createQuizRepository(db) {
  return {
    /** Random questions. Only selects dedicated multiple-choice cards with curated options. `topic` may be a group slug. */
    async pickQuestions({ topic, level, n }) {
      const { rows } = await db.query(
        `SELECT ${CARD_COLUMNS}, l.topic_id
           FROM cards c JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE c.kind = 'quiz' AND (c.extra->'options' IS NOT NULL)
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
            AND ($2::int IS NULL OR l.level = $2 OR 1=1)
          ORDER BY random() LIMIT $3`,
        [topic ?? null, level ?? null, n],
      );
      return rows;
    },

    /** Random cards from the user's wrong list (latest quiz attempt wrong), so they can be retried. */
    async pickWrongQuestions({ userId, n }) {
      const { rows } = await db.query(
        `SELECT ${CARD_COLUMNS}, l.topic_id FROM (
           SELECT DISTINCT ON (card_id) card_id, correct
             FROM quiz_attempts WHERE user_id = $1 ORDER BY card_id, answered_at DESC) w
           JOIN cards c ON c.id = w.card_id
           JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE NOT w.correct AND c.kind = 'quiz' AND (c.extra->'options' IS NOT NULL)
          ORDER BY random() LIMIT $2`,
        [userId, n],
      );
      return rows;
    },

    /** Wrong options: answers of other cards in the same topic. */
    async pickDistractors({ cardId, topicId, back }) {
      const { rows } = await db.query(
        `SELECT c.id, c.back FROM cards c JOIN lessons l ON l.id = c.lesson_id
          WHERE c.kind = 'qa' AND c.id <> $1 AND length(c.back) BETWEEN 15 AND 420
            AND (l.topic_id = $2
                 OR EXISTS (SELECT 1 FROM topics t WHERE t.id = l.topic_id AND t.parent_id = (SELECT parent_id FROM topics WHERE id = $2))
                 OR 1=1
                )
            AND c.back <> $3
          ORDER BY (l.topic_id = $2) DESC, random() LIMIT 3`,
        [cardId, topicId, back],
      );
      return rows;
    },

    async findCard(cardId, exec = db) {
      const { rows } = await exec.query('SELECT id, back, extra FROM cards WHERE id = $1', [cardId]);
      return rows[0] ?? null;
    },

    async insertAttempt(userId, cardId, correct, exec = db) {
      await exec.query('INSERT INTO quiz_attempts (user_id, card_id, correct) VALUES ($1,$2,$3)', [userId, cardId, correct]);
    },

    /** Cards whose most recent quiz attempt was wrong. */
    async listWrong(userId) {
      const { rows } = await db.query(
        `SELECT ${CARD_COLUMNS}, w.answered_at FROM (
           SELECT DISTINCT ON (card_id) card_id, correct, answered_at
             FROM quiz_attempts WHERE user_id = $1 ORDER BY card_id, answered_at DESC) w
           JOIN cards c ON c.id = w.card_id
           JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE NOT w.correct ORDER BY w.answered_at DESC LIMIT 100`,
        [userId],
      );
      return rows;
    },
  };
}
