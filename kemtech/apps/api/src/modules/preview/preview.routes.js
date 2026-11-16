import { z } from 'zod';

const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Public (no sign-in) routes for the guest page. */
export default async function previewRoutes(app, { service }) {
  app.get('/public/preview', async () => service.featured());
  app.get('/public/preview/:id', async (req) => service.lesson(idParam.parse(req.params).id));
}
