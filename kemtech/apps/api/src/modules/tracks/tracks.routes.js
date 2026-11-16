import { z } from 'zod';

const id = z.coerce.number().int().positive();
const params = z.object({ id, dayNo: z.coerce.number().int().positive().optional() });

export default async function tracksRoutes(app, { service }) {
  app.get('/tracks', async (req) => service.list(req.userId));
  app.post('/tracks/:id/start', async (req) => service.start(params.parse(req.params).id, req.userId));
  app.get('/tracks/:id', async (req) => service.detail(params.parse(req.params).id, req.userId));
  app.get('/tracks/:id/days/:dayNo', async (req) => {
    const p = params.extend({ dayNo: z.coerce.number().int().positive() }).parse(req.params);
    return service.day(p.id, p.dayNo, req.userId);
  });
}
