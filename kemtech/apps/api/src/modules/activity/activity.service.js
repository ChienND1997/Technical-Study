export const XP = {
  quizCorrect: 3,
  mock: 20,
  lessonSection: 10,
  review: 2,
};

/** Writes study effort (seconds, XP, cards, sections) into the daily activity row through the repository. */
export function createActivityService(activityRepo) {
  return {
    /** Accumulates effort for today; amounts default to 0. `exec` is an optional transaction client. */
    async bump(userId, { seconds = 0, xp = 0, cardsReviewed = 0, sectionsDone = 0 } = {}, exec) {
      if (!activityRepo?.bump) return null;
      return activityRepo.bump(userId, { seconds, xp, cardsReviewed, sectionsDone }, exec);
    },
    async recordActivity(userId, type, xp, details) {
      if (activityRepo?.record) {
        return activityRepo.record(userId, type, xp, details);
      }
      return null;
    },
  };
}
