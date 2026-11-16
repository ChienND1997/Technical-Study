import { z } from 'zod';

const nameBody = z.object({ name: z.string().trim().min(1, 'Tên không được để trống').max(80, 'Tên tối đa 80 ký tự') });
const goalBody = z.object({
  dailyMinutes: z.coerce.number().int().min(5, 'Mục tiêu tối thiểu 5 phút mỗi ngày').max(480),
  topic: z.string().max(100).nullable().optional(),
  difficulty: z.enum(['mixed', 'easy', 'medium', 'hard']).default('mixed'),
});
const passwordBody = z.object({ current: z.string().max(200).optional(), next: z.string().min(6, 'Mật khẩu mới cần ít nhất 6 ký tự').max(200) });

const userIdParam = z.object({ id: z.coerce.number().int().positive() });

export default async function profileRoutes(app, { service }) {
  app.get('/profile', async (req) => service.get(req.userId));
  app.get('/users/:id/profile', async (req) => service.getPublic(userIdParam.parse(req.params).id));
  app.put('/profile', async (req) => service.saveName(req.userId, nameBody.parse(req.body).name));
  app.put('/profile/goal', async (req) => service.saveGoal(req.userId, goalBody.parse(req.body)));
  app.put('/profile/password', async (req) => service.changePassword(req.userId, passwordBody.parse(req.body)));
}
