import { z } from 'zod';

const id = z.object({ id: z.coerce.number().int().positive() });
const when = z.string().datetime({ offset: true }).nullable().optional();
const fields = {
  kind: z.enum(['info', 'feature', 'maintenance', 'upgrade']),
  title: z.string().trim().min(3, 'Tiêu đề cần ít nhất 3 ký tự').max(120),
  body: z.string().max(20000),
  startsAt: when,
  endsAt: when,
  active: z.boolean(),
};
const createBody = z.object({ ...fields, kind: fields.kind.default('info'), body: fields.body.default(''), active: fields.active.default(true), notify: z.boolean().optional() });
const updateBody = z.object(fields).partial();

export default async function announcementsRoutes(app, { service }) {
  app.get('/public/announcements', async () => service.listActive());
  app.get('/public/announcements/history', async () => service.listHistory());
  app.get('/admin/announcements', async () => service.listAll());
  app.post('/admin/announcements', async (req) => service.create(req.userId, createBody.parse(req.body)));
  app.put('/admin/announcements/:id', async (req) => service.update(id.parse(req.params).id, updateBody.parse(req.body)));
  app.delete('/admin/announcements/:id', async (req) => service.remove(id.parse(req.params).id));
}
