import { useSyncExternalStore } from 'react';

const KEY = 'kt-theme';
const listeners = new Set();

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable: fall through to the system preference */
  }
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

let current = initial();
if (typeof document !== 'undefined') document.documentElement.dataset.theme = current;

/** 'light' | 'dark' (applied as `data-theme` on <html>, remembered in localStorage). */
export const getTheme = () => current;

export function setTheme(theme) {
  current = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = current;
  try {
    localStorage.setItem(KEY, current);
  } catch {
    /* best effort */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Current theme string; re-renders when `setTheme` is called. */
export const useTheme = () => useSyncExternalStore(subscribe, getTheme, getTheme);
