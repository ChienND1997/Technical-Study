import { createDb } from './db/pool.js';
import { createPresenceHub } from './modules/realtime/presence.hub.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAdminService } from './modules/admin/admin.service.js';
import { createAnnouncementsRepository } from './modules/announcements/announcements.repository.js';
import { createAnnouncementsService } from './modules/announcements/announcements.service.js';
import { createProfileRepository } from './modules/profile/profile.repository.js';
import { createProfileService } from './modules/profile/profile.service.js';
import { createNotificationRepository } from './modules/notification/notification.repository.js';
import { createNotificationService } from './modules/notification/notification.service.js';
import { createActivityRepository } from './modules/activity/activity.repository.js';
import { createActivityService } from './modules/activity/activity.service.js';
import { createContentRepository } from './modules/content/content.repository.js';
import { createContentService } from './modules/content/content.service.js';
import { createTracksRepository } from './modules/tracks/tracks.repository.js';
import { createTracksService } from './modules/tracks/tracks.service.js';
import { createPlanRepository } from './modules/plan/plan.repository.js';
import { createPlanService } from './modules/plan/plan.service.js';
import { createDashboardRepository } from './modules/dashboard/dashboard.repository.js';
import { createDashboardService } from './modules/dashboard/dashboard.service.js';
import { createTodayRepository } from './modules/today/today.repository.js';
import { createTodayService } from './modules/today/today.service.js';
import { createBlogRepository } from './modules/blog/blog.repository.js';
import { createBlogService } from './modules/blog/blog.service.js';
import { createGameRepository } from './modules/game/game.repository.js';
import { createGameService } from './modules/game/game.service.js';
import { createProgressRepository } from './modules/progress/progress.repository.js';
import { createProgressService } from './modules/progress/progress.service.js';
import { createStatsRepository } from './modules/stats/stats.repository.js';
import { createStatsService } from './modules/stats/stats.service.js';
import { createReviewRepository } from './modules/review/review.repository.js';
import { createReviewService } from './modules/review/review.service.js';
import { createPracticeRepository } from './modules/practice/practice.repository.js';
import { createPracticeService } from './modules/practice/practice.service.js';
import { createQuizRepository } from './modules/quiz/quiz.repository.js';
import { createQuizService } from './modules/quiz/quiz.service.js';
import { createMockRepository } from './modules/mock/mock.repository.js';
import { createMockService } from './modules/mock/mock.service.js';
import { createGroupsRepository } from './modules/groups/groups.repository.js';
import { createGroupsService } from './modules/groups/groups.service.js';
import { createPreviewRepository } from './modules/preview/preview.repository.js';
import { createPreviewService } from './modules/preview/preview.service.js';
import { createIngestRepository } from './modules/ingest/ingest.repository.js';
import { createIngestService } from './modules/ingest/ingest.service.js';

/** Wires repositories and services together (the only place that knows every module). */
export function createContainer(config) {
  const db = createDb(config.databaseUrl);
  const hub = createPresenceHub();

  // shared services other modules depend on
  const authRepo = createAuthRepository(db);
  const auth = createAuthService({ authRepo, config });
  const notifier = createNotificationService({ notifRepo: createNotificationRepository(db), hub });
  const activity = createActivityService(createActivityRepository(db));
  const ingest = createIngestService({ db, ingestRepo: createIngestRepository(), config });
  const game = createGameService({ gameRepo: createGameRepository(db) });

  const services = {
    auth,
    admin: createAdminService({ authRepo, authService: auth, ingest }),
    announcements: createAnnouncementsService({ announcementsRepo: createAnnouncementsRepository(db), notifier, authRepo }),
    profile: createProfileService({ profileRepo: createProfileRepository(db), authRepo }),
    notifications: notifier,
    content: createContentService({ contentRepo: createContentRepository(db) }),
    tracks: createTracksService({ tracksRepo: createTracksRepository(db) }),
    plan: createPlanService({ planRepo: createPlanRepository(db) }),
    dashboard: createDashboardService({ dashboardRepo: createDashboardRepository(db) }),
    today: createTodayService({ todayRepo: createTodayRepository(db) }),
    blog: createBlogService({ blogRepo: createBlogRepository(db), notifier, authService: auth }),
    game,
    progress: createProgressService({ db, progressRepo: createProgressRepository(db), activity, gameService: game }),
    stats: createStatsService({ statsRepo: createStatsRepository(db) }),
    review: createReviewService({ db, reviewRepo: createReviewRepository(db), activity }),
    practice: createPracticeService({ practiceRepo: createPracticeRepository(db) }),
    preview: createPreviewService({ previewRepo: createPreviewRepository(db) }),
    quiz: createQuizService({ db, quizRepo: createQuizRepository(db), activity }),
    mock: createMockService({ db, mockRepo: createMockRepository(db), activity }),
    groups: createGroupsService({ groupsRepo: createGroupsRepository(db), authService: auth, notifier, hub }),
  };

  return { db, hub, services, ingest, close: () => db.close() };
}
