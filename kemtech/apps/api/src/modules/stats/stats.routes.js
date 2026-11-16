import { z } from 'zod';

const userIdParam = z.object({ id: z.coerce.number().int().positive() });

export default async function statsRoutes(app, { service }) {
  app.get('/stats', async (req) => service.overview(req.userId));
  app.get('/stats/day/:day', async (req) => service.day(req.userId, req.params.day));
  // read-only: lets a signed-in user view someone else's study stats (same payload, any userId).
  app.get('/users/:id/stats', async (req) => service.overview(userIdParam.parse(req.params).id));
  app.get('/users/:id/stats/day/:day', async (req) => service.day(userIdParam.parse(req.params).id, req.params.day));
}
