import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const PING_MS = 25000;
const MAX_BACKOFF_MS = 30000;

/**
 * Keeps one WebSocket open to /api/ws while the user is signed in and calls `onNotification`
 * for each pushed notification.
 *
 * Staying online: the client pings every 25 s (the server answers and also pings), reconnects with
 * exponential backoff after a drop, and reconnects straight away when the tab becomes visible again
 * or the network comes back. After every (re)connect the notification queries are refreshed so
 * nothing sent while offline is missed.
 */
export function useLiveNotifications(onNotification) {
  const qc = useQueryClient();
  const handler = useRef(onNotification);
  handler.current = onNotification;

  useEffect(() => {
    let ws = null;
    let pingTimer = null;
    let retryTimer = null;
    let attempt = 0;
    let stopped = false;

    const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

    function connect() {
      if (stopped || (ws && ws.readyState <= 1)) return; // already connecting or open
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);

      ws.onopen = () => {
        attempt = 0;
        refresh();
        clearInterval(pingTimer);
        pingTimer = setInterval(() => ws?.readyState === 1 && ws.send('{"type":"ping"}'), PING_MS);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'notification') {
            refresh();
            handler.current?.(msg.data);
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
