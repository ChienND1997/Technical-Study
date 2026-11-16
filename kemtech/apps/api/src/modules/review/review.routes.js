import { z } from 'zod';

const ids = z.array(z.number().int()).min(1).max(500);
const addBody = z.object({ lessonId: z.number().int().optional(), cardIds: ids.optional() });
const removeBody = z.object({ cardIds: ids });
const basketQuery = z.object({
  status: z.enum(['all', 'new', 'due', 'learning', 'strong']).default('all'),
  topic: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
const queueQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), topic: z.string().optional() });
const answerBody = z.object({
  cardId: z.number().int(),
  rating: z.number().int().min(1).max(4),
  direction: z.enum(['qa', 'aq']).default('qa'),
  durationMs: z.number().int().min(0).optional(),
});

export default async function reviewRoutes(app, { service }) {
  app.post('/cards/basket', async (req) => service.addToBasket(req.userId, addBody.parse(req.body)));
  app.get('/basket', async (req) => service.basket(req.userId, basketQuery.parse(req.query)));
  app.post('/basket/remove', async (req) => service.removeFromBasket(req.userId, removeBody.parse(req.body).cardIds));
  // The recovered review/api.js lacks these two; ReviewPage.jsx calls fetchReviewQueue({limit,topic}) and answerCard({...}).
  app.get('/review/queue', async (req) => service.queue(req.userId, queueQuery.parse(req.query)));
  app.post('/review/answer', async (req) => service.answer(req.userId, answerBody.parse(req.body)));
}
