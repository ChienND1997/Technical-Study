import { XP } from '../activity/activity.service.js';

export function createMockService({ db, mockRepo, activity }) {
  return {
    async start({ topic, level, n }) {
      return { cards: await mockRepo.pickCards({ topic, level, n }) };
    },

    /** Stores a finished session. Weak answers are offered to the user for the basket, never added automatically. */
    finish({ userId, scope, durationSec, answers }) {
      return db.tx(async (c) => {
        const id = await mockRepo.createSession({ userId, scope, durationSec }, c);
        await mockRepo.insertAnswers(id, answers, c);
        await activity.bump(userId, { seconds: durationSec, xp: XP.mock }, c);
        return { id };
      });
    },

    history(userId) {
      return mockRepo.listHistory(userId);
    },
  };
}
