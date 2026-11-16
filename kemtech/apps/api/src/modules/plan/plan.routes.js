export default async function planRoutes(app, { service }) {
  app.post('/plan/generate', async (req) => service.generate(req.userId));
}
