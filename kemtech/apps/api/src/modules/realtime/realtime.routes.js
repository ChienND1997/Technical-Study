import websocket from '@fastify/websocket';

const PING_MS = 25000;

/** GET /ws (authenticated WebSocket) and GET /presence/online. */
export default async function realtimeRoutes(app, { hub }) {
  if (!app.hasDecorator('websocketServer')) await app.register(websocket); // the lead may already have registered it

  app.get('/ws', { websocket: true }, (socket, req) => {
    const user = req.user;
    if (!user) {
      socket.close(4401, 'unauthorized');
      return;
    }
    hub.add(user.id, socket, { name: user.name, avatarUrl: user.avatarUrl });
    const timer = setInterval(() => hub.pingAll(), PING_MS);
    timer.unref?.();
    socket.on('message', (raw) => hub.handleMessage(socket, raw));
    socket.on('close', () => {
      clearInterval(timer);
      hub.remove(user.id, socket);
    });
    socket.on('error', () => socket.close());
  });

  // everyone online except the caller
  app.get('/presence/online', async (req) => hub.onlineUsers().filter((u) => u.id !== req.userId));
}
