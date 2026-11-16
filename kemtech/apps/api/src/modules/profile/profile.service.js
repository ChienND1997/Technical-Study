import { BadRequestError, NotFoundError, UnauthorizedError } from '../../common/errors.js';
import { MIN_PASSWORD, hashPassword, verifyPassword } from '../auth/password.js';
import { BADGES } from '../game/badges.js';
import { levelInfo } from '../game/levels.js';

export const DEFAULT_GOAL = { dailyMinutes: 30, topic: null, difficulty: 'mixed' };
const DIFFICULTY = ['mixed', 'easy', 'medium', 'hard'];
const ymd = (d) => d.toISOString().slice(0, 10);

/** Consecutive active days ending today (or yesterday, so the streak survives until midnight). */
export function streakOf(days, today = new Date()) {
  const set = new Set(days);
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (!set.has(ymd(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(ymd(d))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** Level progress for a total XP (same formula and titles as GET /game). */
export const levelOf = (xp) => {
  const { level, title, into, span } = levelInfo(xp);
  return { level, title, xp, into, span };
};

/** Normalises a stored/incoming goal to valid values. */
export function cleanGoal(g = {}) {
  const m = Math.round(Number(g.dailyMinutes));
  return {
    dailyMinutes: Number.isFinite(m) ? Math.min(480, Math.max(5, m)) : DEFAULT_GOAL.dailyMinutes,
    topic: g.topic ? String(g.topic) : null,
    difficulty: DIFFICULTY.includes(g.difficulty) ? g.difficulty : 'mixed',
  };
}

/** The signed-in user's own profile: name, daily goal, password. */
export function createProfileService({ profileRepo, authRepo }) {
  async function self(userId) {
    const u = await authRepo.findById(userId);
    if (!u) throw new NotFoundError('Không tìm thấy tài khoản');
    return u;
  }

  return {
    async get(userId) {
      const [u, settings, xp, days, badges] = await Promise.all([
        self(userId), profileRepo.getSettings(userId), profileRepo.totalXp(userId), profileRepo.activeDays(userId), profileRepo.badges(userId),
      ]);
      return {
        user: { id: u.id, name: u.name, email: u.email ?? null, avatarUrl: u.avatar_url ?? null, isAdmin: u.role === 'admin', joinedAt: u.created_at },
        goal: cleanGoal(settings.goal ?? DEFAULT_GOAL),
        game: { ...levelOf(xp), streak: streakOf(days), badges: badges.flatMap((id) => BADGES.filter((b) => b.id === id).map(({ test, ...b }) => b)) },
      };
    },

    /** Anyone's public profile: name, level/XP, streak and badges — never the email or the private daily goal. */
    async getPublic(id) {
      const u = await authRepo.findById(id);
      if (!u || u.deleted_at) throw new NotFoundError('Không tìm thấy người dùng');
      const [xp, days, badges] = await Promise.all([profileRepo.totalXp(id), profileRepo.activeDays(id), profileRepo.badges(id)]);
      return {
        user: { id: u.id, name: u.name, avatarUrl: u.avatar_url ?? null, isAdmin: u.role === 'admin', joinedAt: u.created_at, active: u.active },
        game: { ...levelOf(xp), streak: streakOf(days), badges: badges.flatMap((bid) => BADGES.filter((b) => b.id === bid).map(({ test, ...b }) => b)) },
      };
    },

    async saveName(userId, name) {
      name = String(name ?? '').trim();
      if (!name) throw new BadRequestError('Tên không được để trống');
      if (name.length > 80) throw new BadRequestError('Tên tối đa 80 ký tự');
      await self(userId);
      await authRepo.setName(userId, name);
      return { ok: true, name };
    },

    async saveGoal(userId, goal) {
      if (!(Number(goal?.dailyMinutes) >= 5)) throw new BadRequestError('Mục tiêu tối thiểu 5 phút mỗi ngày');
      const clean = cleanGoal(goal);
      await profileRepo.saveGoal(userId, clean);
      return clean;
    },

    /** `current` is required only when the account already has a password (Google-only accounts may set one). */
    async changePassword(userId, { current, next }) {
      if (String(next ?? '').length < MIN_PASSWORD) throw new BadRequestError(`Mật khẩu mới cần ít nhất ${MIN_PASSWORD} ký tự`);
      const u = await self(userId);
      if (u.password_hash && !(await verifyPassword(current ?? '', u.password_hash))) throw new UnauthorizedError('Mật khẩu hiện tại không đúng');
      await authRepo.setPasswordHash(userId, await hashPassword(next));
      return { ok: true };
    },
  };
}
