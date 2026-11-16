import { readCookie } from '../modules/auth/session.js';
import { ForbiddenError, UnauthorizedError } from '../common/errors.js';

const OPEN = [/^\/api\/health$/, /^\/api\/auth\//, /^\/api\/public\//];

/**
 * Fills req.user / req.userId from the session cookie, then enforces access:
 * every /api route needs a signed-in user except health, auth and public ones; /api/admin needs an admin.
 */
export function attachAuth(app, authService) {
  app.decorateRequest('user', null);
  app.decorateRequest('userId', null);
  app.addHook('onRequest', async (req) => {
    const path = req.url.split('?')[0];
    if (!path.startsWith('/api/')) return;
    req.user = (await authService.sessionUser(readCookie(req.headers.cookie))) ?? null;
    req.userId = req.user?.id ?? null;
    if (OPEN.some((re) => re.test(path))) return;
    if (!req.user) throw new UnauthorizedError('Bạn cần đăng nhập');
    if (path.startsWith('/api/admin/') && !(req.user.isAdmin || req.user.role === 'admin')) {
      throw new ForbiddenError('Chỉ quản trị viên được phép');
    }
  });
}
