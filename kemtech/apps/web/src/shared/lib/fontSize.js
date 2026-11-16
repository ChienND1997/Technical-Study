import { useSyncExternalStore } from 'react';

const KEY = 'kt-fs';
const listeners = new Set();

/** Text size options; `key` is applied as `data-fs` on <html> ('base' = no override). */
export const FONT_SIZES = [
  { key: 'sm', label: 'Nhỏ' },
  { key: 'base', label: 'Vừa' },
  { key: 'lg', label: 'Lớn' },
  { key: 'xl', label: 'Rất lớn' },
];

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (FONT_SIZES.some((f) => f.key === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return 'base';
}

let current = initial();
const apply = () => {
  if (typeof document === 'undefined') return;
  if (current === 'base') delete document.documentElement.dataset.fs;
  else document.documentElement.dataset.fs = current;
};
apply();

export const getFontSize = () => current;

export function setFontSize(key) {
  if (!FONT_SIZES.some((f) => f.key === key)) return;
  current = key;
  apply();
  try {
    localStorage.setItem(KEY, key);
  } catch {
    /* best effort */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Current size key; re-renders when `setFontSize` is called. */
export const useFontSize = () => useSyncExternalStore(subscribe, getFontSize, getFontSize);
