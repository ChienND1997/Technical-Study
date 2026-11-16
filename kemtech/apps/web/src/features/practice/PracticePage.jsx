import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import PageHero from '@/shared/components/PageHero.jsx';
import QuizPage from '@/features/quiz/QuizPage.jsx';
import WrongPage from '@/features/quiz/WrongPage.jsx';
import BasketPage from '@/features/review/BasketPage.jsx';
import MockPage from '@/features/mock/MockPage.jsx';
import Suggestions from './Suggestions.jsx';
import { useSuggestionsQuery } from './queries.js';

const PANELS = {
  quiz: QuizPage,
  wrong: WrongPage,
  basket: BasketPage,
  mock: MockPage,
};

/** Unified practice & memory retention hub: Quiz, Wrong Notebook, Spaced Flashcards, and Mock Interview. */
export default function PracticePage() {
  const { mode = 'quiz', topic } = useSearch({ strict: false });
  const [busy, setBusy] = useState(false);
  const activeMode = PANELS[mode] ? mode : 'quiz';
  const Panel = PANELS[activeMode];
  // Counts already needed by the Suggestions sidebar; reused here so each mode card shows what's waiting
  // for the learner (visible state beats having to click in and find out).
  const { data: sug } = useSuggestionsQuery();

  return (
    <div>
      <PageHero
        tag="Luyện tập & Ôn tập"
        title={<>Luyện tập <em>mỗi ngày</em></>}
        sub="Trắc nghiệm kiểm tra nhanh, sửa lỗi từ sổ câu sai, lặp lại ngắt quãng với flashcard để nhớ lâu, và phỏng vấn thử."
        icon="🎯"
      />
      <div className={`practice-grid ${busy ? 'busy' : ''}`}>
        <div>
          <div className="mode-cards" role="tablist">
            <Link
              id="mode-tab-quiz"
              to="/practice"
              search={{ mode: 'quiz', topic }}
              role="tab"
              aria-selected={activeMode === 'quiz'}
              aria-controls="mode-panel"
              className={`mode-card ${activeMode === 'quiz' ? 'on' : ''}`}
            >
              <span className="mode-ic">🧪</span>
              <span><b>Trắc nghiệm</b><small>1 trong 4 đáp án, chấm điểm ngay</small></span>
            </Link>
            <Link
              id="mode-tab-wrong"
              to="/practice"
              search={{ mode: 'wrong', topic }}
              role="tab"
              aria-selected={activeMode === 'wrong'}
              aria-controls="mode-panel"
              className={`mode-card ${activeMode === 'wrong' ? 'on' : ''}`}
            >
              <span className="mode-ic">📕</span>
              <span><b>Sổ câu sai</b><small>Xem lại & xoá câu từng làm sai</small></span>
              {sug?.wrongCount > 0 && <span className="mode-badge">{sug.wrongCount}</span>}
            </Link>
            <Link
              id="mode-tab-basket"
              to="/practice"
              search={{ mode: 'basket', topic }}
              role="tab"
              aria-selected={activeMode === 'basket'}
              aria-controls="mode-panel"
              className={`mode-card ${activeMode === 'basket' ? 'on' : ''}`}
            >
              <span className="mode-ic">🧺</span>
              <span><b>Flashcard ôn tập</b><small>Lặp lại ngắt quãng để nhớ sâu</small></span>
              {sug?.dueCount > 0 && <span className="mode-badge">{sug.dueCount}</span>}
            </Link>
            <Link
              id="mode-tab-mock"
              to="/practice"
              search={{ mode: 'mock', topic }}
              role="tab"
              aria-selected={activeMode === 'mock'}
              aria-controls="mode-panel"
              className={`mode-card ${activeMode === 'mock' ? 'on' : ''}`}
            >
              <span className="mode-ic">🎤</span>
              <span><b>Phỏng vấn thử</b><small>Nói thành tiếng, tự chấm 0–3</small></span>
            </Link>
          </div>
          <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${activeMode}`}>
            <Panel key={`${activeMode}-${topic ?? ''}`} embedded initialTopic={topic} onBusy={setBusy} />
          </div>
        </div>
        {!busy && activeMode !== 'basket' && <Suggestions />}
      </div>
    </div>
  );
}