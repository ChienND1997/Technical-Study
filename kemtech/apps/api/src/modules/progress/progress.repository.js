/** SQL for section completion and the one-time XP reward ledger. */
export function createProgressRepository(db) {
  return {
    async findSection(id, exec = db) {
      const { rows } = await exec.query('SELECT id, lesson_id, ord, minutes FROM sections WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
    /** All sections of a lesson in order, with the user's done flag. */
    async lessonSections(userId, lessonId, exec = db) {
      const { rows } = await exec.query(
        `SELECT s.id, s.ord, (p.section_id IS NOT NULL) AS done
           FROM sections s LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $1
          WHERE s.lesson_id = $2 ORDER BY s.ord`,
        [userId, lessonId],
      );
      return rows;
    },
    /** True when the row was newly inserted. */
    async markDone(userId, sectionId, exec = db) {
      const { rowCount } = await exec.query(
        'INSERT INTO progress_sections (user_id, section_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, sectionId]);
      return rowCount > 0;
    },
    async unmark(userId, sectionId, exec = db) {
      const { rowCount } = await exec.query('DELETE FROM progress_sections WHERE user_id = $1 AND section_id = $2', [userId, sectionId]);
      return rowCount > 0;
    },
    /** True when this is the first time the section is rewarded (so XP may be granted). */
    async claimReward(userId, sectionId, exec = db) {
      const { rowCount } = await exec.query(
        'INSERT INTO section_rewards (user_id, section_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, sectionId]);
      return rowCount > 0;
    },
  };
}
