import { z } from 'zod';
import { readCookie, sessionCookie } from './session.js';

const loginBody = z.object({ identifier: z.string().min(1, 'Nhập email hoặc tên tài khoản').max(200), password: z.string().min(1, 'Nhập mật khẩu').max(200) });
const adminBody = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(200) });
const googleBody = z.object({ credential: z.string().min(10, 'Thiếu thông tin Google') });
const searchQuery = z.object({ q: z.string().max(80).default('') });

export default async function authRoutes(app, { service }) {
  const secure = (req) => req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  const startSession = (req, reply, user) => {
    const { token, maxAgeSec } = service.issueSession(user.id);
    reply.header('Set-Cookie', sessionCookie(token, maxAgeSec, secure(req)));
    return { user };
  };

  app.get('/auth/config', async () => service.config());
  // Logged-out visitors get { user: null } (not 401) so the login screen can render.
  app.get('/auth/me', async (req) => ({ user: await service.sessionUser(readCookie(req.headers.cookie)) }));
  app.post('/auth/login', async (req, reply) => startSession(req, reply, await service.loginPassword(loginBody.parse(req.body))));
  app.post('/auth/admin', async (req, reply) => startSession(req, reply, await service.loginEnvAdmin(adminBody.parse(req.body))));
  app.post('/auth/google', async (req, reply) => startSession(req, reply, await service.loginGoogle(googleBody.parse(req.body).credential)));
  app.post('/auth/logout', async (req, reply) => {
    reply.header('Set-Cookie', sessionCookie('', 0, secure(req)));
    return { ok: true };
  });
  app.get('/users/search', async (req) => service.searchUsers(req.userId, searchQuery.parse(req.query).q));
}
