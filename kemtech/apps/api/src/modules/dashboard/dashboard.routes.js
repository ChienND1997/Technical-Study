export default async function dashboardRoutes(app, { service }) {
  app.get('/dashboard', async (req) => service.get(req.userId));
}
