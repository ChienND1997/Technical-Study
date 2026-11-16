import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuizService } from './quiz.service.js';
import { NotFoundError } from '../../common/errors.js';

const fakeDb = { tx: (fn) => fn({ marker: 'tx' }) };

function setup({ distractors = 3 } = {}) {
  const events = [];
  const quizRepo = {
    pickQuestions: async () => [{ id: 1, front: 'Q?', back: 'Right answer', topic_id: 7, lesson_id: 2, lesson_title: 'L', topic_title: 'T' }],
    pickDistractors: async () => Array.from({ length: distractors }, (_, i) => ({ id: 10 + i, back: `Wrong ${i}` })),
    findCard: async (id) => (id === 1 ? { id: 1, back: 'Right answer', extra: { nho: 'remember' } } : null),
    insertAttempt: async (u, c, correct) => events.push(`attempt:${correct}`),
    enqueueCard: async () => events.push('enqueue'),
  };
  const activity = { bump: async (u, delta) => events.push(`bump:${JSON.stringify(delta)}`) };
  return { service: createQuizService({ db: fakeDb, quizRepo, activity, random: () => 0 }), events, quizRepo };
}

test('createQuiz builds four options that include the correct answer', async () => {
  const { service } = setup();
  const { questions } = await service.createQuiz({ n: 1 });
  assert.equal(questions.length, 1);
  assert.equal(questions[0].options.length, 4);
  assert.ok(questions[0].options.some((o) => o.cardId === 1 && o.text === 'Right answer'));
});

test('createQuiz can be built from the wrong list of a user', async () => {
  const { service, quizRepo } = setup();
  let asked = null;
  quizRepo.pickWrongQuestions = async (a) => { asked = a; return quizRepo.pickQuestions(); };
  const { questions } = await service.createQuiz({ n: 5, wrongOf: 7 });
  assert.deepEqual(asked, { userId: 7, n: 5 });
  assert.equal(questions.length, 1);
});

test('createQuiz skips questions without enough distractors', async () => {
  const { service } = setup({ distractors: 2 });
  assert.equal((await service.createQuiz({ n: 1 })).questions.length, 0);
});

test('createQuiz uses curated options without picking random distractors', async () => {
  const { service, quizRepo } = setup();
  quizRepo.pickQuestions = async () => [
    {
      id: 99,
      front: 'Curated Q?',
      back: 'Correct Opt',
      topic_id: 1,
      lesson_id: 1,
      extra: {
        options: [
          { text: 'Correct Opt', correct: true },
          { text: 'Distractor A', correct: false },
          { text: 'Distractor B', correct: false },
          { text: 'Distractor C', correct: false },
        ],
        explanation: 'Because reasons',
      },
    },
  ];
  quizRepo.pickDistractors = async () => {
    throw new Error('Should not call pickDistractors when curated options exist');
  };
  const { questions } = await service.createQuiz({ n: 1 });
  assert.equal(questions.length, 1);
  assert.equal(questions[0].options.length, 4);
  const correctOpt = questions[0].options.find((o) => o.text === 'Correct Opt');
  assert.ok(correctOpt);
  assert.equal(correctOpt.cardId, 99);
  const wrongOpt = questions[0].options.find((o) => o.text === 'Distractor A');
  assert.ok(wrongOpt);
  assert.notEqual(wrongOpt.cardId, 99);
});

test('a correct answer awards XP and does not enqueue the card', async () => {
  const { service, events } = setup();
  const r = await service.answer({ userId: 1, cardId: 1, chosenCardId: 1 });
  assert.equal(r.correct, true);
  assert.equal(r.nho, 'remember');
  assert.ok(events.includes('attempt:true'));
  assert.ok(!events.includes('enqueue'));
  assert.ok(events.some((e) => e.includes('"xp":3')));
});

test('a wrong answer is recorded without XP and never touches the basket', async () => {
  const { service, events } = setup();
  const r = await service.answer({ userId: 1, cardId: 1, chosenCardId: 10 });
  assert.equal(r.correct, false);
  assert.ok(events.includes('attempt:false'));
  assert.ok(!events.includes('enqueue'));
  assert.ok(!events.some((e) => e.includes('"xp"')));
});

test('answering an unknown card raises NotFound', async () => {
  const { service } = setup();
  await assert.rejects(() => service.answer({ userId: 1, cardId: 99, chosenCardId: 1 }), NotFoundError);
});
