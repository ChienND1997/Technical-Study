import { BADGES, badgesToAward } from './badges.js';
import { computeStreaks, levelInfo } from './levels.js';

const pub = (b) => ({ id: b.id, icon: b.icon, title: b.title, desc: b.desc });

/** Level, streak and badges. Badges are awarded lazily whenever the user's state is evaluated. */
export function createGameService({ gameRepo }) {
  // Badges awarded outside GET /game (e.g. by completing a section), shown as toasts on the next GET /game.
  const pending = new Map();

  async function snapshot(userId, exec) {
    const [c, days, earnedRows] = await Promise.all([gameRepo.counters(userId, exec), gameRepo.activeDays(userId, exec), gameRepo.earned(userId, exec)]);
    const lv = levelInfo(c.xp);
    const counters = { ...c, ...computeStreaks(days, c.today), level: lv.level };
    return { counters, lv, earnedRows };
  }

  return {
    /** Awards any newly reached badges and returns them (used by other services after changing progress). */
    async evaluate(userId, exec) {
      const { counters, earnedRows } = await snapshot(userId, exec);
      const ids = badgesToAward(counters, earnedRows.map((r) => r.badge));
      await gameRepo.award(userId, ids, exec);
      const fresh = BADGES.filter((b) => ids.includes(b.id)).map(pub);
      if (fresh.length) pending.set(userId, [...(pending.get(userId) ?? []), ...fresh]);
      return fresh;
    },

    /** Payload of GET /game. */
    async get(userId) {
      await this.evaluate(userId);
      const { counters, lv, earnedRows } = await snapshot(userId);
      const at = new Map(earnedRows.map((r) => [r.badge, r.earned_at]));
      const newBadges = pending.get(userId) ?? [];
      pending.delete(userId);
      return {
        level: lv.level, title: lv.title, xp: lv.xp, into: lv.into, span: lv.span, toNext: lv.toNext,
        streak: counters.streak, bestStreak: counters.bestStreak,
        badges: BADGES.map((b) => ({ ...pub(b), earned: at.has(b.id), earnedAt: at.get(b.id) ?? null })),
        newBadges,
      };
    },
  };
}
