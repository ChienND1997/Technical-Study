import { NotFoundError } from '../../common/errors.js';
import { shuffle } from '../../common/sql.js';
import { XP } from '../activity/activity.service.js';

/** Seconds credited for answering one quiz question. */
const SECONDS_PER_QUESTION = 20;

export function createQuizService({ db, quizRepo, activity, random = Math.random }) {
  return {
    /**
     * Builds a multiple-choice quiz: prioritizes dedicated questions with curated options.
     * For older Q&A cards without curated options, picks plausible distractors from the same topic.
     */
    async createQuiz({ topic, level, n, wrongOf }) {
      // `wrongOf` is a user id: build the quiz from that user's wrong list instead of random cards
      const picks = wrongOf ? await quizRepo.pickWrongQuestions({ userId: wrongOf, n }) : await quizRepo.pickQuestions({ topic, level, n });
      const questions = [];
      for (const p of picks) {
        let options = [];
        const curated = Array.isArray(p.extra?.options) && p.extra.options.length >= 2 ? p.extra.options : null;
        if (curated) {
          options = shuffle(
            curated.map((opt, idx) => ({
              cardId: opt.correct ? p.id : -((idx + 1) * 1000 + p.id),
              text: opt.text,
            })),
            random,
          );
        } else {
          const distractors = await quizRepo.pickDistractors({ cardId: p.id, topicId: p.topic_id, back: p.back });
          if (distractors.length < 3) continue;
          options = shuffle(
            [{ cardId: p.id, text: p.back }, ...distractors.map((d) => ({ cardId: d.id, text: d.back }))],
            random,
          );
        }

        questions.push({
          cardId: p.id,
          question: p.front,
          options,
          lessonId: p.lesson_id,
          lessonTitle: p.lesson_title,
          topicTitle: p.topic_title,
        });
      }
      // `wrongOnly` lets the client confirm that the wrong list (not random cards) was used
      return { questions, wrongOnly: !!wrongOf };
    },

    /** Grades an answer. Wrong answers are only recorded (the "wrong list"); the user adds cards to the basket on purpose. */
    answer({ userId, cardId, chosenCardId }) {
      return db.tx(async (c) => {
        const card = await quizRepo.findCard(cardId, c);
        if (!card) throw new NotFoundError('Không có thẻ');
        const correct = chosenCardId === cardId;
        await quizRepo.insertAttempt(userId, cardId, correct, c);
        if (correct) {
          await activity.bump(userId, { xp: XP.quizCorrect, seconds: SECONDS_PER_QUESTION }, c);
        } else {
          await activity.bump(userId, { seconds: SECONDS_PER_QUESTION }, c);
        }
        return {
          correct,
          answer: card.back,
          nho: card.extra?.nho ?? null,
          explanation: card.extra?.explanation ?? null,
        };
      });
    },

    listWrong(userId) {
      return quizRepo.listWrong(userId);
    },
  };
}
