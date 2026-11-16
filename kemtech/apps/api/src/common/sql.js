/** Columns of a card row (table alias `c`) shared by the quiz and mock queries. */
export const CARD_COLUMNS = 'c.id, c.lesson_id, c.section_ord, c.kind, c.ord, c.front, c.back, c.extra';

/** Returns a shuffled copy (Fisher-Yates); `random` is injectable for tests. */
export function shuffle(array, random = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
