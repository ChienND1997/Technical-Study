import { z } from 'zod';

const params = z.object({ id: z.coerce.number().int().positive() });
const body = z.object({ done: z.boolean() });

export default async function progressRoutes(app, { service }) {
  app.post('/sections/:id/complete', async (req) => {
    const { id } = params.parse(req.params);
    const { done } = body.parse(req.body);
    return service.complete({ userId: req.userId, sectionId: id, done });
  });
}
