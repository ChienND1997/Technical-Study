import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { XP } from '../activity/activity.service.js';
import { preview, schedule } from './srs.js';

/** Max seconds credited for one card (a card left open overnight must not inflate study time). */
const MAX_SECONDS_PER_CARD = 120;

export function createReviewService({ db, reviewRepo, activity }) {
  return {
    /** Adds cards to the basket: `lessonId` adds every card of the lesson, `cardIds` specific cards. */
    async addToBasket(userId, { lessonId, cardIds }) {
      if (!lessonId && !cardIds?.length) throw new BadRequestError('Chưa chọn thẻ nào');
      return { added: await reviewRepo.addCards(userId, { cardIds: cardIds ?? [], lessonId: lessonId ?? null }) };
    },

    async removeFromBasket(userId, cardIds) {
      return { removed: await reviewRepo.removeCards(userId, cardIds) };
    },

    /** Page of basket cards plus per-status counts. */
    async basket(userId, { status = 'all', topic, offset = 0, limit = 30 }) {
      const [counts, cards] = await Promise.all([reviewRepo.counts(userId, topic), reviewRepo.listBasket(userId, { status, topic, offset, limit })]);
      return { counts, cards };
    },

    /** Cards to study now, each with the interval labels of the four rating buttons. */
    async queue(userId, { limit = 20, topic }) {
      const [rows, total] = await Promise.all([reviewRepo.dueQueue(userId, { topic, limit }), reviewRepo.dueTotal(userId, topic)]);
      return { total, cards: rows.map((r) => ({ ...r, preview: preview(r) })) };
    },

    /** Records one rating: reschedules the card, logs it and credits effort. */
    answer(userId, { cardId, rating, direction = 'qa', durationMs }) {
      return db.tx(async (c) => {
        const cur = await reviewRepo.getState(userId, cardId, c);
        if (!cur) throw new NotFoundError('Thẻ không có trong giỏ');
        const next = schedule(cur, rating);
        await reviewRepo.saveState(userId, cardId, next, c);
        await reviewRepo.insertLog(userId, { cardId, rating, direction, prevInterval: cur.interval_minutes, newInterval: next.interval_minutes, durationMs }, c);
        const seconds = Math.min(MAX_SECONDS_PER_CARD, Math.round((durationMs ?? 0) / 1000));
        await activity.bump(userId, { seconds, xp: XP.review, cardsReviewed: 1 }, c);
        return { state: next.state, dueAt: next.due_at, intervalMinutes: next.interval_minutes, requeueAfter: next.requeueAfter };
      });
    },
  };
}
