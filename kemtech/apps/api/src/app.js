import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { setErrorHandler } from './http/error-handler.js';
import { attachAuth } from './http/request-context.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import announcementsRoutes from './modules/announcements/announcements.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import tracksRoutes from './modules/tracks/tracks.routes.js';
import planRoutes from './modules/plan/plan.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import todayRoutes from './modules/today/today.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import realtimeRoutes from './modules/realtime/realtime.routes.js';
import blogRoutes from './modules/blog/blog.routes.js';
import gameRoutes from './modules/game/game.routes.js';
import progressRoutes from './modules/progress/progress.routes.js';
import statsRoutes from './modules/stats/stats.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import practiceRoutes from './modules/practice/practice.routes.js';
import previewRoutes from './modules/preview/preview.routes.js';
import quizRoutes from './modules/quiz/quiz.routes.js';
import mockRoutes from './modules/mock/mock.routes.js';
import groupsRoutes from './modules/groups/groups.routes.js';

/** Builds the Fastify app: auth context, error handler and every module's routes under /api. */
export async function buildApp({ services, hub }) {
  const app = fastify({ logger: false });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(websocket);
  setErrorHandler(app);
  attachAuth(app, services.auth);

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(
    async (api) => {
      const s = services;
      await api.register(authRoutes, { service: s.auth });
      await api.register(adminRoutes, { service: s.admin });
      await api.register(announcementsRoutes, { service: s.announcements });
      await api.register(profileRoutes, { service: s.profile });
      await api.register(contentRoutes, { service: s.content });
      await api.register(tracksRoutes, { service: s.tracks });
      await api.register(planRoutes, { service: s.plan });
      await api.register(dashboardRoutes, { service: s.dashboard });
      await api.register(todayRoutes, { service: s.today });
      await api.register(notificationRoutes, { service: s.notifications });
      await api.register(realtimeRoutes, { hub });
      await api.register(blogRoutes, { service: s.blog });
      await api.register(gameRoutes, { service: s.game });
      await api.register(progressRoutes, { service: s.progress });
      await api.register(statsRoutes, { service: s.stats });
      await api.register(reviewRoutes, { service: s.review });
      await api.register(practiceRoutes, { service: s.practice });
      await api.register(previewRoutes, { service: s.preview });
      await api.register(quizRoutes, { service: s.quiz });
      await api.register(mockRoutes, { service: s.mock });
      await api.register(groupsRoutes, { service: s.groups });
    },
    { prefix: '/api' },
  );

  return app;
}
