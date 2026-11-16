import { useEffect, useState } from 'react';
import AnnouncementCard from './AnnouncementCard.jsx';
import { useActiveAnnouncements } from './queries.js';
import { OPEN_ANNOUNCEMENT_EVENT, markSeen, useHidden, useSeen } from './seen.js';

/** Shows each new announcement once as a popup, and the one opened from the bell. */
export default function AnnouncementPopup() {
  const { data = [] } = useActiveAnnouncements();
  const seen = useSeen();
  const hidden = useHidden();
  const [opened, setOpened] = useState(null); // announcement chosen from the bell

  useEffect(() => {
    const onOpen = (e) => setOpened(e.detail);
    window.addEventListener(OPEN_ANNOUNCEMENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ANNOUNCEMENT_EVENT, onOpen);
  }, []);

  const unseen = data.filter((a) => !seen.includes(a.id) && !hidden.includes(a.id));
  const current = opened ?? unseen[0];
  if (!current) return null;
  const more = opened ? 0 : unseen.length - 1;

  const close = () => {
    markSeen([current.id]);
    setOpened(null);
  };

  return (
    <div className="ann-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ann-modal" role="dialog" aria-modal="true">
        <AnnouncementCard
          kind={current.kind}
          title={current.title}
          body={current.body}
          onClose={close}
          footer={
            <>
              {more > 0 && <span className="ann-more">Còn {more} thông báo khác</span>}
              <button type="button" className="btn ann-ok" onClick={close}>Đã hiểu</button>
            </>
          }
        />
      </div>
    </div>
  );
}
