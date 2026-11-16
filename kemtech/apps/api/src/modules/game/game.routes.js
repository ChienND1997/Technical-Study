export default async function gameRoutes(app, { service }) {
  app.get('/game', async (req) => service.get(req.userId));
}
