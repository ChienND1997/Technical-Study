/** Announcement kinds (they match the `announcements.kind` check constraint); `tone` is the CSS color class. */
export const KINDS = {
  info: { label: 'Thông tin', icon: 'ℹ️', tone: 'info' },
  feature: { label: 'Tính năng mới', icon: '✨', tone: 'feature' },
  maintenance: { label: 'Bảo trì', icon: '🛠️', tone: 'maintenance' },
  upgrade: { label: 'Nâng cấp', icon: '🚀', tone: 'upgrade' },
};

/** ISO timestamp -> "dd/mm/yyyy hh:mm". */
export function fmtWhen(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
