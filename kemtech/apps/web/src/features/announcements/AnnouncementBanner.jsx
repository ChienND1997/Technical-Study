import { useState } from 'react';
import { KINDS, fmtWhen } from './kinds.js';
import { useActiveAnnouncements } from './queries.js';

const KEY = 'kt-ann-closed';
const readClosed = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};

/** Banners for the active system announcements. Each can be closed; the choice is remembered in this browser. */
export default function AnnouncementBanner() {
  const { data = [] } = useActiveAnnouncements();
  const [closed, setClosed] = useState(readClosed);
  const shown = data.filter((a) => !closed.includes(a.id)).slice(0, 3);
  if (shown.length === 0) return null;

  const close = (id) => {
    const next = [...closed, id].slice(-50);
    setClosed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* the announcement just comes back after a reload */
    }
  };

  return (
    <div className="ann-stack" role="region" aria-label="Thông báo hệ thống">
      {shown.map((a) => {
        const k = KINDS[a.kind] ?? KINDS.info;
        return (
          <div key={a.id} className={`ann ann-${k.tone}`}>
            <span className="ann-ic" aria-hidden="true">{k.icon}</span>
            <div className="ann-main">
              <b>{k.label}: {a.title}</b>
              {a.body && <p>{a.body}</p>}
              {a.ends_at && <span className="ann-when">Đến {fmtWhen(a.ends_at)}</span>}
            </div>
            <button type="button" className="ann-x" onClick={() => close(a.id)} aria-label="Đóng thông báo" title="Đóng">×</button>
          </div>
        );
      })}
    </div>
  );
}
