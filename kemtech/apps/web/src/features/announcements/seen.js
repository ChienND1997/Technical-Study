import { useSyncExternalStore } from 'react';

const SEEN = 'kt-ann-seen'; // ids the user has opened
const HIDDEN = 'kt-ann-hidden'; // ids the user removed from the bell
const OPEN_EVENT = 'kt-ann-open';
const listeners = new Set();
const cache = new Map(); // key -> { raw, list } so snapshots stay referentially stable

function read(key) {
  let raw = '[]';
  try {
    raw = localStorage.getItem(key) ?? '[]';
  } catch {
    /* storage unavailable: behave as if nothing was stored */
  }
  const hit = cache.get(key);
  if (hit?.raw === raw) return hit.list;
  let list = [];
  try {
    list = JSON.parse(raw);
  } catch {
    /* corrupted value: start over */
  }
  cache.set(key, { raw, list });
  return list;
}

function add(key, ids) {
  const next = [...new Set([...read(key), ...ids])].slice(-200);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    cache.set(key, { raw: JSON.stringify(next), list: next });
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useSeen = () => useSyncExternalStore(subscribe, () => read(SEEN));
export const useHidden = () => useSyncExternalStore(subscribe, () => read(HIDDEN));
export const markSeen = (ids) => add(SEEN, ids);
export const hideAnnouncements = (ids) => add(HIDDEN, ids);

/** Marks the announcement as seen and asks the popup to show it. */
export function openAnnouncement(a) {
  markSeen([a.id]);
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: a }));
}

export const OPEN_ANNOUNCEMENT_EVENT = OPEN_EVENT;
