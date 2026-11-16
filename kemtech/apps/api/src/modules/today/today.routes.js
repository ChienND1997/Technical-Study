export default async function todayRoutes(app, { service }) {
  app.get('/today', async (req) => service.get(req.userId));
}
