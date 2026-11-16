/** Level number (1..3) -> label shown in the small colored tag. */
export const LEVELS = { 1: 'Dễ', 2: 'Trung bình', 3: 'Khó' };

/** ISO date -> "dd/mm/yyyy". */
export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN');
}

/** Minutes -> "45 phút" or "2 giờ 5 phút". */
export function fmtMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} giờ ${r} phút` : `${h} giờ`;
}
