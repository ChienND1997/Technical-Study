export default async function practiceRoutes(app, { service }) {
  app.get('/practice/suggestions', async (req) => service.suggestions(req.userId));
}
