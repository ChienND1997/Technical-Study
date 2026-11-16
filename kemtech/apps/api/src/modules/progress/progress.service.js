import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { XP } from '../activity/activity.service.js';

/** Marks sections done / undone in lesson order; XP is granted only the first time a section is completed. */
export function createProgressService({ db, progressRepo, activity, gameService }) {
  return {
    /** Sets a section's done flag. Returns { done, xp, newBadges, lessonDone }. */
    complete({ userId, sectionId, done }) {
      return db.tx(async (c) => {
        const sec = await progressRepo.findSection(sectionId, c);
        if (!sec) throw new NotFoundError('Không có phiên học này');
        const all = await progressRepo.lessonSections(userId, sec.lesson_id, c);
        const idx = all.findIndex((s) => s.id === sec.id);
        let xp = 0;

        if (done) {
          if (all.slice(0, idx).some((s) => !s.done)) throw new BadRequestError('Hãy hoàn thành các phiên trước đó trước');
          if (await progressRepo.markDone(userId, sec.id, c)) {
            const first = await progressRepo.claimReward(userId, sec.id, c);
            if (first) xp = XP.lessonSection;
            await activity.bump(userId, { xp, seconds: first ? sec.minutes * 60 : 0, sectionsDone: 1 }, c);
          }
        } else {
          if (all.slice(idx + 1).some((s) => s.done)) throw new BadRequestError('Hãy bỏ đánh dấu các phiên sau trước');
          if (await progressRepo.unmark(userId, sec.id, c)) await activity.bump(userId, { sectionsDone: -1 }, c);
        }

        const newBadges = done ? await gameService.evaluate(userId, c) : [];
        const lessonDone = all.every((s) => (s.id === sec.id ? done : s.done));
        return { done: !!done, xp, newBadges, lessonDone };
      });
    },
  };
}
