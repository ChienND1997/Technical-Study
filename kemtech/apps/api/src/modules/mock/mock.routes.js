import { z } from 'zod';

const startQuery = z.object({
  topic: z.string().optional(),
  level: z.coerce.number().int().min(1).max(3).optional(),
  n: z.coerce.number().int().min(1).max(30).default(5),
});

const finishBody = z.object({
  scope: z.record(z.unknown()).default({}),
  durationSec: z.number().int().default(0),
  answers: z.array(z.object({
    cardId: z.number().int(),
    score: z.number().int().min(0).max(3),
  })).default([]),
});

export default async function mockRoutes(app, { service }) {
  app.get('/mock/start', async (req) => {
    const q = startQuery.parse(req.query);
    return service.start(q);
  });

  app.post('/mock/finish', async (req) => {
    const body = finishBody.parse(req.body);
    return service.finish({ userId: req.userId, ...body });
  });

  app.get('/mock/history', async (req) => {
    return service.history(req.userId);
  });
}

