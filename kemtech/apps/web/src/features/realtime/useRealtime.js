import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const PING_MS = 25000;
const MAX_BACKOFF_MS = 30000;
export const NOTIFICATION_EVENT = 'kt-notification';

/**
 * Keeps one WebSocket open to /api/ws while the user is signed in and turns pushed events into
 * cache refreshes: notifications, who is online, and group changes (chat, members, assignments).
 * A pushed notification is also re-dispatched as a window event so the bell can show a toast.
 *
 * Staying online: the client pings every 25 s (the server answers and also pings), reconnects with
 * exponential backoff after a drop, and reconnects straight away when the tab becomes visible again
 * or the network comes back. After every (re)connect the live queries are refreshed so nothing sent
 * while offline is missed.
 */
export function useRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let ws = null;
    let pingTimer = null;
    let retryTimer = null;
    let attempt = 0;
    let stopped = false;

    const refreshAll = () => {
      for (const key of ['notifications', 'presence', 'groups']) qc.invalidateQueries({ queryKey: [key] });
    };

    function connect() {
      if (stopped || (ws && ws.readyState <= 1)) return; // already connecting or open
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);

      ws.onopen = () => {
        attempt = 0;
        refreshAll();
        clearInterval(pingTimer);
        pingTimer = setInterval(() => ws?.readyState === 1 && ws.send('{"type":"ping"}'), PING_MS);
      };
      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data);
          if (event === 'notification') {
            qc.invalidateQueries({ queryKey: ['notifications'] });
            if (data?.type === 'group_message') qc.invalidateQueries({ queryKey: ['groups'] }); // unread badge in the panel
            window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: data }));
          } else if (event === 'presence') {
            qc.invalidateQueries({ queryKey: ['presence'] });
          } else if (event === 'group_event') {
            qc.invalidateQueries({ queryKey: ['groups'] });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws?.close();
    }

    const wake = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(retryTimer);
        connect();
      }
    };
    connect();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => {
      stopped = true;
      clearInterval(pingTimer);
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      ws?.close();
    };
  }, [qc]);
}
