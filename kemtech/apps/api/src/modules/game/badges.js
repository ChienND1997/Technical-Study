/** Badge catalog. `test(s)` receives the user's counters (see game.repository.counters). */
export const BADGES = [
  { id: 'first_section', icon: '📖', title: 'Bước đầu tiên', desc: 'Hoàn thành phiên học đầu tiên', test: (s) => s.sections >= 1 },
  { id: 'sections_10', icon: '📚', title: 'Mọt sách', desc: 'Hoàn thành 10 phiên học', test: (s) => s.sections >= 10 },
  { id: 'sections_50', icon: '🎓', title: 'Học giả', desc: 'Hoàn thành 50 phiên học', test: (s) => s.sections >= 50 },
  { id: 'first_review', icon: '🃏', title: 'Ôn tập đầu tiên', desc: 'Ôn thẻ lần đầu tiên', test: (s) => s.reviews >= 1 },
  { id: 'reviews_100', icon: '🧠', title: 'Trí nhớ bền', desc: 'Ôn 100 lượt thẻ', test: (s) => s.reviews >= 100 },
  { id: 'basket_20', icon: '🧺', title: 'Giỏ đầy', desc: 'Có 20 thẻ trong giỏ', test: (s) => s.basket >= 20 },
  { id: 'mature_20', icon: '💎', title: 'Nhớ lâu', desc: '20 thẻ đã vững (khoảng ôn ≥ 7 ngày)', test: (s) => s.mature >= 20 },
  { id: 'quiz_50', icon: '🧪', title: 'Tay trắc nghiệm', desc: 'Trả lời đúng 50 câu trắc nghiệm', test: (s) => s.quizCorrect >= 50 },
  { id: 'first_mock', icon: '🎤', title: 'Phỏng vấn thử', desc: 'Hoàn thành buổi phỏng vấn thử đầu tiên', test: (s) => s.mocks >= 1 },
  { id: 'mock_5', icon: '🏅', title: 'Sẵn sàng phỏng vấn', desc: 'Hoàn thành 5 buổi phỏng vấn thử', test: (s) => s.mocks >= 5 },
  { id: 'streak_3', icon: '🔥', title: 'Giữ lửa', desc: 'Học 3 ngày liên tiếp', test: (s) => s.bestStreak >= 3 },
  { id: 'streak_7', icon: '⚡', title: 'Một tuần bền bỉ', desc: 'Học 7 ngày liên tiếp', test: (s) => s.bestStreak >= 7 },
  { id: 'streak_30', icon: '🌟', title: 'Kỷ luật thép', desc: 'Học 30 ngày liên tiếp', test: (s) => s.bestStreak >= 30 },
  { id: 'xp_500', icon: '⭐', title: '500 XP', desc: 'Đạt 500 XP', test: (s) => s.xp >= 500 },
  { id: 'level_5', icon: '👑', title: 'Cấp 5', desc: 'Đạt cấp độ 5', test: (s) => s.level >= 5 },
];

/** Ids of badges whose condition holds for `counters` and that are not in `earnedIds` yet. */
export const badgesToAward = (counters, earnedIds) =>
  BADGES.filter((b) => !earnedIds.includes(b.id) && b.test(counters)).map((b) => b.id);
