import { z } from 'zod';

const id = z.object({ id: z.coerce.number().int().positive() });
const pw = z.string().min(6, 'Mật khẩu cần ít nhất 6 ký tự').max(200);
const createBody = z.object({
  name: z.string().trim().min(1, 'Nhập họ tên').max(80),
  email: z.string().trim().email('Email chưa đúng định dạng').max(200),
  password: pw,
  role: z.enum(['user', 'admin']).default('user'),
});

export default async function adminRoutes(app, { service }) {
  app.get('/admin/users', async () => service.listUsers());
  app.post('/admin/users', async (req) => service.createUser(createBody.parse(req.body)));
  app.put('/admin/users/:id/role', async (req) => service.setRole(req.userId, id.parse(req.params).id, z.object({ role: z.enum(['user', 'admin']) }).parse(req.body).role));
  app.put('/admin/users/:id/active', async (req) => service.setActive(req.userId, id.parse(req.params).id, z.object({ active: z.boolean() }).parse(req.body).active));
  app.put('/admin/users/:id/password', async (req) => service.resetPassword(id.parse(req.params).id, z.object({ password: pw }).parse(req.body).password));
  app.delete('/admin/users/:id', async (req) => service.softDelete(req.userId, id.parse(req.params).id));
  app.post('/admin/users/:id/restore', async (req) => service.restore(id.parse(req.params).id));
  app.post('/admin/ingest', async () => service.runIngest());
}
