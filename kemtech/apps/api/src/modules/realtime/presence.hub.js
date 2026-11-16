const OPEN = 1;
let current = null;

/** The most recently created hub (lets services that are not wired with the hub still read presence). */
export const activeHub = () => current;

/** In-memory registry of live sockets per user; also broadcasts 'presence' when someone goes on/offline. */
export function createPresenceHub() {
  const sockets = new Map(); // userId -> Set(socket)
  const profiles = new Map(); // userId -> { id, name, avatarUrl }

  function write(socket, payload) {
    if (socket.readyState !== undefined && socket.readyState !== OPEN) return false;
    try {
      socket.send(payload);
      return true;
    } catch {
      return false; // a dead socket is cleaned up by its close handler
    }
  }

  const hub = {
    isOnline: (id) => (sockets.get(id)?.size ?? 0) > 0,
    onlineIds: () => [...sockets.keys()],
    /** Public profiles of everyone online (only those registered with a profile). */
    onlineUsers: () => [...sockets.keys()].map((id) => profiles.get(id)).filter(Boolean),

    /** Sends {event,data} to every socket of one user. */
    sendTo(id, event, data) {
      const payload = JSON.stringify({ event, data });
      for (const s of sockets.get(id) ?? []) write(s, payload);
    },
    sendMany(ids, event, data) {
      for (const id of new Set(ids)) hub.sendTo(id, event, data);
    },

    /** Registers a socket (profile is optional: { name, avatarUrl }); announces the user when it is their first socket. */
    add(userId, socket, profile) {
      const set = sockets.get(userId) ?? new Set();
      const first = set.size === 0;
      set.add(socket);
      sockets.set(userId, set);
      if (profile) profiles.set(userId, { id: userId, name: profile.name, avatarUrl: profile.avatarUrl ?? null });
      if (first) hub.sendMany(hub.onlineIds(), 'presence', { userId, online: true });
    },
    remove(userId, socket) {
      const set = sockets.get(userId);
      if (!set) return;
      set.delete(socket);
      if (set.size > 0) return;
      sockets.delete(userId);
      profiles.delete(userId);
      hub.sendMany(hub.onlineIds(), 'presence', { userId, online: false });
    },

    /** Answers the client's {"type":"ping"} keep-alive with a pong frame. */
    handleMessage(socket, raw) {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg?.type === 'ping') write(socket, JSON.stringify({ event: 'pong', data: { t: Date.now() } }));
    },
    /** Server-side keep-alive: a ping frame to every socket (also keeps proxies from closing idle connections). */
    pingAll() {
      const payload = JSON.stringify({ event: 'ping', data: null });
      for (const set of sockets.values()) for (const s of set) write(s, payload);
    },
  };
  current = hub;
  return hub;
}
