import { z } from 'zod';

const idParam = z.object({ id: z.coerce.number().int() });
const CATEGORIES = ['system', 'db', 'js', 'frontend', 'security', 'devops', 'ai', 'algo', 'arch', 'career', 'other'];
const postBody = z.object({
  title: z.string().trim().min(5, 'Tiêu đề tối thiểu 5 ký tự').max(200),
  summary: z.string().trim().max(500).default(''),
  body: z.string().trim().min(50, 'Nội dung tối thiểu 50 ký tự').max(50000),
  sourceUrl: z.string().trim().max(500).optional().transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\//i.test(v), 'Link nguồn phải bắt đầu bằng http:// hoặc https://'),
  category: z.enum(CATEGORIES).default('other'),
});
const statusQuery = z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') });
// the UI sends { approve, reason }; { action: 'approve'|'reject' } or { status: 'approved'|'rejected' } are accepted too
const reviewBody = z.object({
  approve: z.boolean().optional(),
  action: z.enum(['approve', 'reject']).optional(),
  status: z.enum(['approved', 'rejected']).optional(),
  reason: z.string().trim().max(500).optional(),
}).transform((b) => ({
  approve: b.approve ?? (b.action ? b.action === 'approve' : b.status === 'approved'),
  reason: b.reason,
}));
const commentsQuery = z.object({ type: z.enum(['post', 'lesson']), id: z.coerce.number().int() });
const commentBody = z.object({
  type: z.enum(['post', 'lesson']),
  id: z.number().int(),
  body: z.string().trim().min(1, 'Bình luận trống').max(1000),
  mentionIds: z.array(z.number().int()).max(10).default([]),
});

export default async function blogRoutes(app, { service }) {
  app.get('/blog/posts', async () => service.listApproved());
  app.get('/blog/mine', async (req) => service.listMine(req.userId));
  app.get('/blog/posts/:id', async (req) => service.get(req.userId, idParam.parse(req.params).id));
  app.post('/blog/posts', async (req) => service.create(req.userId, postBody.parse(req.body)));
  app.put('/blog/posts/:id', async (req) => service.update(req.userId, idParam.parse(req.params).id, postBody.parse(req.body)));
  app.delete('/blog/posts/:id', async (req) => service.remove(req.userId, idParam.parse(req.params).id));

  app.get('/admin/blog', async (req) => service.listForReview(statusQuery.parse(req.query).status));
  app.get('/admin/blog/pending-count', async () => service.pendingCount());
  app.post('/admin/blog/:id/review', async (req) => service.review(req.userId, idParam.parse(req.params).id, reviewBody.parse(req.body)));

  app.get('/blog/comments', async (req) => {
    const q = commentsQuery.parse(req.query);
    return service.listComments(q.type, q.id);
  });
  app.post('/blog/comments', async (req) => service.addComment(req.userId, commentBody.parse(req.body)));
  app.delete('/blog/comments/:id', async (req) => service.removeComment(req.userId, idParam.parse(req.params).id));
}
