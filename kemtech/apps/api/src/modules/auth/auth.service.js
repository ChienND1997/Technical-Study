import { timingSafeEqual } from 'node:crypto';
import { ForbiddenError, UnauthorizedError, BadRequestError, AppError } from '../../common/errors.js';
import { verifyPassword } from './password.js';
import { signToken, verifyToken } from './session.js';

const BAD_LOGIN = 'Sai tài khoản hoặc mật khẩu';
const DAY_SEC = 86400;
const safeEq = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The user shape the frontend and req.user use. Never includes secrets. */
export const toUser = (r) =>
  r && { id: r.id, name: r.name, email: r.email ?? null, role: r.role, active: r.active, avatarUrl: r.avatar_url ?? null, isAdmin: r.role === 'admin' };

/** Accounts, password/Google/env-admin login and stateless HMAC sessions. */
export function createAuthService({ authRepo, config, fetchImpl = globalThis.fetch, now = Date.now }) {
  const adminEmails = new Set((config.adminEmails ?? []).map((e) => e.toLowerCase()));
  /** Row -> user; emails listed in ADMIN_EMAILS are admins regardless of the stored role. */
  const view = (r) => r && toUser(adminEmails.has(String(r.email ?? '').toLowerCase()) ? { ...r, role: 'admin' } : r);
  const usable = (r) => !!r && r.active && !r.deleted_at;
  const loginUser = (r) => {
    if (!r || r.deleted_at || !r.active) throw new ForbiddenError('Tài khoản đã bị vô hiệu hóa hoặc xóa');
    return view(r);
  };

  const service = {
    /** Public sign-in settings for the login page. */
    config: () => ({ googleClientId: config.googleClientId || null, passwordLogin: true }),

    /** Resolves a session token to the live user, or null when invalid, expired, inactive or deleted. */
    async sessionUser(token) {
      const p = verifyToken(config.sessionSecret, token, now());
      const r = p && (await authRepo.findById(p.uid));
      return usable(r) ? view(r) : null;
    },

    /** Creates a signed session token for a user id. */
    issueSession(userId) {
      const maxAgeSec = Math.round((config.sessionTtlDays || 30) * DAY_SEC);
      return { token: signToken(config.sessionSecret, { uid: userId, exp: Math.floor(now() / 1000) + maxAgeSec }), maxAgeSec };
    },

    /** A user (any state) by id, or null. */
    async me(id) {
      return view(await authRepo.findById(id));
    },
    async isAdminAccount(id) {
      const r = await authRepo.findById(id);
      return usable(r) && view(r).role === 'admin';
    },
    async findPublicByIds(ids) {
      return (await authRepo.findPublicByIds(ids)).map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatar_url ?? null }));
    },

    /** Email-or-name + password login; also accepts the env admin credentials. */
    async loginPassword({ identifier, password }) {
      const id = String(identifier ?? '').trim();
      if (!id || !password) throw new UnauthorizedError(BAD_LOGIN);
      if (config.adminUser && config.adminPassword && safeEq(id.toLowerCase(), config.adminUser.toLowerCase()) && safeEq(password, config.adminPassword)) {
        return service.loginEnvAdmin();
      }
      const r = await authRepo.findByLogin(id);
      if (!r || !(await verifyPassword(password, r.password_hash))) throw new UnauthorizedError(BAD_LOGIN);
      return loginUser(r);
    },

    /** Env admin (ADMIN_USER/ADMIN_PASSWORD) -> its users row, created on first use. */
    async loginEnvAdmin(creds) {
      if (creds && !(config.adminUser && config.adminPassword && safeEq(creds.username, config.adminUser) && safeEq(creds.password, config.adminPassword))) {
        throw new UnauthorizedError(BAD_LOGIN);
      }
      const row = (await authRepo.findAdminByName(config.adminUser)) ?? (await authRepo.create({ name: config.adminUser, role: 'admin' }));
      return loginUser(row);
    },

    /** Verifies a Google id_token via tokeninfo, then finds, links or creates the account. */
    async loginGoogle(credential) {
      if (!config.googleClientId) throw new BadRequestError('Chưa cấu hình đăng nhập Google');
      let info;
      try {
        const res = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        info = res.ok ? await res.json() : null;
      } catch {
        throw new AppError('Không kết nối được Google, thử lại sau', 502);
      }
      if (!info || info.aud !== config.googleClientId || !info.sub || !info.email || String(info.email_verified) !== 'true') {
        throw new UnauthorizedError('Đăng nhập Google không hợp lệ');
      }
      let r = await authRepo.findByGoogleSub(info.sub);
      if (!r) {
        const byEmail = await authRepo.findByEmail(info.email);
        r = byEmail
          ? await authRepo.linkGoogle(byEmail.id, info.sub, info.picture ?? null)
          : await authRepo.create({ name: info.name || info.email.split('@')[0], email: info.email, googleSub: info.sub, avatarUrl: info.picture ?? null });
      }
      return loginUser(r);
    },

    /** Users matching a mention query, without the caller. */
    async searchUsers(userId, q) {
      const term = String(q ?? '').trim();
      if (!term) return [];
      return (await authRepo.search(term, userId)).map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatar_url ?? null }));
    },
  };
  return service;
}

