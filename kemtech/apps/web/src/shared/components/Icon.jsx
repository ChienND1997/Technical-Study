/** Minimal stroke icon set (24x24, currentColor) so the navbar does not depend on an icon package. */
const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13',
  cards: 'M8 7h11v13H8zM5 17V4h11',
  check: 'M4 12l5 5L20 6',
  mic: 'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3',
  trophy: 'M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8',
  note: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  wrong: 'M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  logout: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9',
  moon: 'M20 14A8 8 0 1110 4a6.5 6.5 0 0010 10z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  blog: 'M4 5h16v14H4zM8 9h8M8 13h5',
  basket: 'M3 9h18l-2 11H5L3 9zM8 9l3-5M16 9l-3-5',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeoff: 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.5A17 17 0 002 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2',
  bell: 'M6 9a6 6 0 0112 0c0 6 2 7.5 2 7.5H4S6 15 6 9zM10 20a2 2 0 004 0',
  group: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6M18 20a6 6 0 00-3-5.2',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3M12 15v2',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
};

/** Each icon has its own accent color, like the colorful navbar of the reference design. */
const COLORS = {
  home: '#6366f1', map: '#10b981', book: '#3b82f6', cards: '#ec4899', check: '#22c55e', mic: '#a855f7',
  trophy: '#f59e0b', note: '#f97316', more: '#64748b', search: '#0ea5e9', chart: '#0ea5e9', wrong: '#ef4444',
  shield: '#8b5cf6', blog: '#14b8a6', basket: '#ec4899', user: '#3b82f6', logout: '#ef4444', moon: '#6366f1', sun: '#f59e0b', star: '#f59e0b', bell: '#f59e0b', group: '#06b6d4',
};

/** `plain` keeps the surrounding text color (used on colored buttons). */
export default function Icon({ name, size = 18, plain = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={plain ? undefined : { color: COLORS[name] }}>
      <path d={PATHS[name] ?? PATHS.more} />
    </svg>
  );
}