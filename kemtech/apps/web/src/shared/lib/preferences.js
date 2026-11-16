/** Small per-viewer preferences (e.g. flashcard direction) kept in localStorage, guarded by try/catch. */
export function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(`kt-${key}`);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
export function savePref(key, value) {
  try {
    localStorage.setItem(`kt-${key}`, JSON.stringify(value));
  } catch {
    /* ignore: preferences are best-effort */
  }
}
