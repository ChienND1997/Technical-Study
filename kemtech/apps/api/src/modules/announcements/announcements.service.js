import { BadRequestError, NotFoundError } from '../../common/errors.js';

export const KINDS = ['info', 'feature', 'maintenance', 'upgrade'];

/** System announcements: public reads, admin CRUD. */
export function createAnnouncementsService({ announcementsRepo, notifier, authRepo }) {
  const valid = (a) => {
    if (!KINDS.includes(a.kind)) throw new BadRequestError('Loại thông báo không hợp lệ');
    if (String(a.title ?? '').trim().length < 3) throw new BadRequestError('Tiêu đề cần ít nhất 3 ký tự');
    if (a.startsAt && a.endsAt && new Date(a.endsAt) <= new Date(a.startsAt)) throw new BadRequestError('Ngày kết thúc phải sau ngày bắt đầu');
    return a;
  };
  /** Pushes a bell notification when an announcement goes live immediately. */
  async function announce(a) {
    if (!a.active || new Date(a.starts_at) > new Date()) return;
    for (const userId of await authRepo.activeUserIds()) {
      await notifier.notify({ userId, actorId: a.created_by, type: 'announcement', text: a.title, link: '/', refId: a.id }).catch(() => {});
    }
  }

  return {
    listActive: () => announcementsRepo.listActive(),
    listHistory: () => announcementsRepo.listHistory(),
    listAll: () => announcementsRepo.listAll(),

    async create(adminId, input) {
      const d = valid({ kind: 'info', body: '', active: true, ...input });
      const row = await announcementsRepo.create({ ...d, title: d.title.trim(), body: (d.body ?? '').trim(), createdBy: adminId });
      // The bell already lists announcements via /public/announcements/history, so no duplicate notification rows by default.
      if (notifier && input.notify) await announce(row);
      return row;
    },

    async update(id, patch) {
      const cur = await announcementsRepo.get(id);
      if (!cur) throw new NotFoundError('Không tìm thấy thông báo');
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const m = valid({ kind: cur.kind, title: cur.title, body: cur.body, startsAt: cur.starts_at, endsAt: cur.ends_at, active: cur.active, ...defined });
      return announcementsRepo.update(id, { ...m, title: m.title.trim(), body: (m.body ?? '').trim() });
    },

    async remove(id) {
      if (!(await announcementsRepo.remove(id))) throw new NotFoundError('Không tìm thấy thông báo');
      return { ok: true };
    },
  };
}
