export function readLast() {
  try {
    const raw = localStorage.getItem('kt-last-read');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLast(lesson) {
  try {
    localStorage.setItem('kt-last-read', JSON.stringify(lesson));
  } catch { }
}

export function readPos(lessonId) {
  try {
    const raw = localStorage.getItem(`kt-pos-${lessonId}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function savePos(lessonId, pos) {
  try {
    localStorage.setItem(`kt-pos-${lessonId}`, String(pos));
  } catch { }
}
