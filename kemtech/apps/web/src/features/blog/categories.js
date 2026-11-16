// Blog categories; posts are matched by the number in the file name `blog-NN-`.
export const CATEGORIES = [
  { key: 'all', label: 'Tất cả', icon: '📰' },
  { key: 'system', label: 'Hệ thống lớn', icon: '🏗️', posts: [4, 5, 6, 8, 21, 22, 24, 35, 36] },
  { key: 'db', label: 'Database', icon: '🗄️', posts: [1, 11, 12, 13, 14, 15] },
  { key: 'js', label: 'JavaScript', icon: '🟨', posts: [2] },
  { key: 'frontend', label: 'Frontend', icon: '🎨', posts: [16, 17, 18, 19, 20, 33, 34] },
  { key: 'security', label: 'Bảo mật', icon: '🔐', posts: [3, 27] },
  { key: 'devops', label: 'DevOps', icon: '🐳', posts: [7, 9, 23, 25] },
  { key: 'ai', label: 'AI', icon: '🤖', posts: [26] },
  { key: 'algo', label: 'Thuật toán', icon: '🧮', posts: [28] },
  { key: 'arch', label: 'Kiến trúc', icon: '🧱', posts: [29, 31, 32] },
  { key: 'career', label: 'Sự nghiệp', icon: '🧭', posts: [10, 30] },
  { key: 'other', label: 'Khác', icon: '✍️', posts: [] },
];

export function categoryOf(path) {
  const n = Number(/blog-(\d+)-/.exec(path ?? '')?.[1]);
  return CATEGORIES.find((c) => c.posts?.includes(n)) ?? null;
}

export const catByKey = (key) => CATEGORIES.find((c) => c.key === key) ?? null;
