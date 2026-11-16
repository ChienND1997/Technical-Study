import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import { activeHub } from '../realtime/presence.hub.js';
import { MIN_PASSWORD, hashPassword } from '../auth/password.js';

const EMAIL = /^\S+@\S+\.\S+$/;

/** Admin-only user management and the ingest trigger. */
export function createAdminService({ authRepo, authService, ingest, hub }) {
  async function target(id) {
    const u = await authRepo.findById(id);
    if (!u) throw new NotFoundError('Không tìm thấy người dùng');
    return u;
  }
  /** Blocks changes that would lock out the acting admin or leave the system without an active admin. */
  async function guardAdmin(actorId, u, what) {
    if (u.role !== 'admin') return;
    if (u.id === actorId) throw new ForbiddenError(`Bạn không thể tự ${what} tài khoản của mình`);
    const left = (await authRepo.activeAdminIds()).filter((i) => i !== u.id);
    if (!left.length) throw new ForbiddenError(`Không thể ${what} quản trị viên cuối cùng`);
  }
  const ok = { ok: true };

  return {
    listUsers: async () => (await authRepo.listAll()).map((u) => ({ ...u, online: !!(hub ?? activeHub())?.isOnline(u.id) })),

    async createUser({ name, email, password, role = 'user' }) {
      name = String(name ?? '').trim();
      email = String(email ?? '').trim();
      if (!name) throw new BadRequestError('Nhập họ tên');
      if (!EMAIL.test(email)) throw new BadRequestError('Email chưa đúng định dạng');
      if (String(password ?? '').length < MIN_PASSWORD) throw new BadRequestError(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`);
      if (!['user', 'admin'].includes(role)) throw new BadRequestError('Quyền không hợp lệ');
      if (await authRepo.findByEmail(email)) throw new BadRequestError('Email này đã được dùng');
      const u = await authRepo.create({ name, email, role, passwordHash: await hashPassword(password) });
      return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };
    },

    async setRole(actorId, id, role) {
      if (!['user', 'admin'].includes(role)) throw new BadRequestError('Quyền không hợp lệ');
      const u = await target(id);
      if (role !== 'admin') await guardAdmin(actorId, u, 'hạ quyền');
      await authRepo.setRole(id, role);
      return ok;
    },

    async setActive(actorId, id, active) {
      const u = await target(id);
      if (!active) await guardAdmin(actorId, u, 'vô hiệu hóa');
      await authRepo.setActive(id, !!active);
      return ok;
    },

    async softDelete(actorId, id) {
      await guardAdmin(actorId, await target(id), 'xóa');
      await authRepo.softDelete(id);
      return ok;
    },

    async restore(id) {
      await target(id);
      await authRepo.restore(id);
      return ok;
    },

    async resetPassword(id, password) {
      if (String(password ?? '').length < MIN_PASSWORD) throw new BadRequestError(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`);
      const u = await target(id);
      if (u.deleted_at) throw new BadRequestError('Tài khoản đã bị xóa');
      await authRepo.setPasswordHash(id, await hashPassword(password));
      return ok;
    },

    /** Re-imports the markdown content. */
    runIngest: async () => (await ingest.run()) ?? ok,
  };
}
