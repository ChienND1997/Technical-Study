import { z } from 'zod';

const id = z.coerce.number().int().positive();

export default async function contentRoutes(app, { service }) {
  app.get('/topics', async (req) => service.listTopics(req.userId));
  app.get('/topics/:slug', async (req) => service.getTopic(z.string().min(1).parse(req.params.slug), req.userId));
  app.get('/lessons/:id', async (req) => service.getLesson(id.parse(req.params.id), req.userId));

  app.get('/search', async (req) => service.search(z.object({ q: z.string().default('') }).parse(req.query).q));
  app.get('/resolve', async (req) => service.resolve(z.object({ p: z.string().default('') }).parse(req.query).p));

  // The quotes table was dropped: keep the endpoints the journal page calls, always empty
  app.get('/quotes', async () => []);
  app.get('/quotes/random', async () => ({ quote: null }));
  // Personal notes per lesson
  app.get('/notes', async (req) => service.listNotes(req.userId));
  app.get('/notes/:lessonId', async (req) => service.getNote(req.userId, id.parse(req.params.lessonId)));
  app.put('/notes/:lessonId', async (req) => {
    const { body } = z.object({ body: z.string().max(20000) }).parse(req.body);
    return service.saveNote(req.userId, id.parse(req.params.lessonId), body);
  });
  app.delete('/notes/:lessonId', async (req) => service.deleteNote(req.userId, id.parse(req.params.lessonId)));
}
