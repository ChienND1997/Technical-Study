import { z } from 'zod';

const quizQuery = z.object({
  topic: z.string().optional(),
  level: z.coerce.number().int().min(1).max(3).optional(),
  n: z.coerce.number().int().min(1).max(30).default(10),
  wrong: z.enum(['1']).optional(), // retry the wrong list
});

const answerBody = z.object({ cardId: z.number().int(), chosenCardId: z.number().int() });

export default async function quizRoutes(app, { service }) {
  app.get('/quiz', async (req) => {
    const { wrong, ...q } = quizQuery.parse(req.query);
    return service.createQuiz({ ...q, wrongOf: wrong ? req.userId : undefined });
  });

  app.post('/quiz/answer', async (req) => {
    const body = answerBody.parse(req.body);
    return service.answer({ userId: req.userId, ...body });
  });

  app.get('/quiz/wrong', async (req) => service.listWrong(req.userId));
}
