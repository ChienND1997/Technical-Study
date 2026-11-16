import { useEffect, useRef, useState } from 'react';
import { loadPref, savePref } from '@/shared/lib/preferences.js';
import { useGameQuery } from './queries.js';

/** Pops a toast when a badge is earned or the level goes up (level is remembered per browser). */
export default function GameToasts() {
  const { data } = useGameQuery();
  const [toasts, setToasts] = useState([]);
  const seenLevel = useRef(null);

  useEffect(() => {
    if (!data) return;
    const add = [];
    const prev = seenLevel.current ?? loadPref('level', null);
    if (prev !== null && data.level > prev) add.push({ key: `lv${data.level}`, icon: '🎉', text: `Lên cấp ${data.level}: ${data.title}!` });
    seenLevel.current = data.level;
    savePref('level', data.level);
    for (const b of data.newBadges) add.push({ key: b.id, icon: b.icon, text: `Huy hiệu mới: ${b.title}` });
    if (add.length) setToasts((t) => [...t, ...add]);
  }, [data]);

  useEffect(() => {
    if (!toasts.length) return undefined;
    const id = setTimeout(() => setToasts((t) => t.slice(1)), 4500);
    return () => clearTimeout(id);
  }, [toasts]);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.key} className="toast"><span className="toast-ic">{t.icon}</span>{t.text}</div>
      ))}
    </div>
  );
}
