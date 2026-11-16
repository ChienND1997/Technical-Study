import { z } from 'zod';

const gid = z.object({ id: z.coerce.number().int() });
const gidAnd = (key) => z.object({ id: z.coerce.number().int(), [key]: z.coerce.number().int() });

const groupBody = z.object({
  name: z.string().trim().min(2, 'Tên nhóm tối thiểu 2 ký tự').max(80),
  description: z.string().trim().max(500).default(''),
});
const inviteBody = z.object({ userId: z.number().int() });
const respondBody = z.object({ accept: z.boolean() });
const roleBody = z.object({ role: z.enum(['deputy', 'member']) });
const transferBody = z.object({ userId: z.number().int() });
const messageBody = z.object({
  body: z.string().trim().min(1, 'Tin nhắn trống').max(1000),
  mentionIds: z.array(z.number().int()).max(10).default([]),
  taskIds: z.array(z.number().int()).max(10).default([]),
});
const reactBody = z.object({
  reaction: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry']),
});
const beforeQuery = z.object({ before: z.coerce.number().int().optional() });
const doneBody = z.object({ done: z.boolean() });
const assignmentBody = z.object({
  title: z.string().trim().min(2, 'Tiêu đề tối thiểu 2 ký tự').max(200),
  description: z.string().trim().max(2000).default(''),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày hạn không hợp lệ').optional().or(z.literal('').transform(() => undefined)),
  lessonId: z.number().int().optional(),
  assigneeIds: z.array(z.number().int()).max(200).optional(),
});

export default async function groupsRoutes(app, { service }) {
  app.get('/groups', async (req) => service.list(req.userId));
  app.post('/groups', async (req) => service.create(req.userId, groupBody.parse(req.body)));
  app.get('/groups/:id', async (req) => service.get(req.userId, gid.parse(req.params).id));
  app.put('/groups/:id', async (req) => service.update(req.userId, gid.parse(req.params).id, groupBody.parse(req.body)));
  app.delete('/groups/:id', async (req) => service.remove(req.userId, gid.parse(req.params).id));

  // invites (responding is addressed by the invite id, not the group id)
  app.post('/groups/:id/invites', async (req) => service.invite(req.userId, gid.parse(req.params).id, inviteBody.parse(req.body).userId));
  app.delete('/groups/:id/invites/:inviteId', async (req) => {
    const p = gidAnd('inviteId').parse(req.params);
    return service.cancelInvite(req.userId, p.id, p.inviteId);
  });
  app.post('/group-invites/:id/respond', async (req) => service.respond(req.userId, gid.parse(req.params).id, respondBody.parse(req.body).accept));

  app.delete('/groups/:id/members/:userId', async (req) => {
    const p = gidAnd('userId').parse(req.params);
    return service.removeMember(req.userId, p.id, p.userId);
  });
  app.put('/groups/:id/members/:userId/role', async (req) => {
    const p = gidAnd('userId').parse(req.params);
    return service.setRole(req.userId, p.id, p.userId, roleBody.parse(req.body).role);
  });
  app.post('/groups/:id/transfer', async (req) => service.transfer(req.userId, gid.parse(req.params).id, transferBody.parse(req.body).userId));

  app.get('/groups/:id/messages', async (req) => service.messages(req.userId, gid.parse(req.params).id, beforeQuery.parse(req.query).before));
  app.post('/groups/:id/messages', async (req) => service.sendMessage(req.userId, gid.parse(req.params).id, messageBody.parse(req.body)));
  app.post('/groups/:id/messages/:mid/reactions', async (req) => {
    const p = gidAnd('mid').parse(req.params);
    return service.reactMessage(req.userId, p.id, p.mid, reactBody.parse(req.body).reaction);
  });
  app.delete('/groups/:id/messages/:mid', async (req) => {
    const p = gidAnd('mid').parse(req.params);
    return service.deleteMessage(req.userId, p.id, p.mid);
  });

  app.get('/groups/:id/assignments', async (req) => service.assignments(req.userId, gid.parse(req.params).id));
  app.post('/groups/:id/assignments', async (req) => service.createAssignment(req.userId, gid.parse(req.params).id, assignmentBody.parse(req.body)));
  app.put('/groups/:id/assignments/:aid', async (req) => {
    const p = gidAnd('aid').parse(req.params);
    return service.updateAssignment(req.userId, p.id, p.aid, assignmentBody.parse(req.body));
  });
  app.delete('/groups/:id/assignments/:aid', async (req) => {
    const p = gidAnd('aid').parse(req.params);
    return service.deleteAssignment(req.userId, p.id, p.aid);
  });
  app.put('/groups/:id/assignments/:aid/done', async (req) => {
    const p = gidAnd('aid').parse(req.params);
    return service.setDone(req.userId, p.id, p.aid, doneBody.parse(req.body).done);
  });
}
