export const ROLE_LABEL = {
  leader: 'Trưởng nhóm',
  deputy: 'Phó nhóm',
  member: 'Thành viên',
};

export function isManager(role) {
  return role === 'leader' || role === 'deputy';
}
