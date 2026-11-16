/**
 * One icon per level tier (beginner to legendary), mirroring the 9 title tiers in apps/api's
 * game/levels.js. Reads as a coding journey: hatch → learn the keyboard → tinker/fix → smooth,
 * working systems → solve harder puzzles → real insight → ship fast → deep mastery → legendary.
 */
const LEVEL_ICONS = ['🐣', '⌨️', '🔧', '⚙️', '🧩', '💡', '🚀', '🧠', '⚡'];

/** Icon for a given level; levels past the last tier keep the top icon. */
export const levelIcon = (level) => LEVEL_ICONS[Math.min(Math.max(level, 1), LEVEL_ICONS.length) - 1];
