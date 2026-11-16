import { z } from 'zod';

const idParam = z.object({ id: z.coerce.number().int() });
const readBody = z.object({ ids: z.array(z.number().int()).max(500).optional() }).default({});

export default async function notificationRoutes(app, { service }) {
  app.get('/notifications', async (req) => service.list(req.userId));
  app.get('/notifications/unread-count', async (req) => service.unreadCount(req.userId));
  app.post('/notifications/read', async (req) => service.markRead(req.userId, readBody.parse(req.body ?? {}).ids));
  app.delete('/notifications/:id', async (req) => service.remove(req.userId, idParam.parse(req.params).id));
  app.delete('/notifications', async (req) => service.clear(req.userId));
}
