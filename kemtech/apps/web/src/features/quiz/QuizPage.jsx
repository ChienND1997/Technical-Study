import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import Markdown from '@/shared/components/Markdown.jsx';
import PageHero from '@/shared/components/PageHero.jsx';
import TopicSelect from '@/shared/components/TopicSelect.jsx';
import LevelSelect from '@/shared/components/LevelSelect.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useDialog } from '@/shared/components/Dialog.jsx';
import { useAddToBasket } from '@/features/review/queries.js';
import { todayKeys } from '@/features/today/queries.js';
import QuestionPills from '@/features/practice/QuestionPills.jsx';
import { answerQuiz, fetchQuiz } from './api.js';
import { quizKeys } from './queries.js';

export default function QuizPage({ embedded = false, initialTopic = '', onBusy, wrongOnly = false, wrongCount = 30, onExit }) {
  const dlg = useDialog();
  const qc = useQueryClient();
  const basket = useAddToBasket();

  const [cfg, setCfg] = useState({ topic: initialTopic ?? '', level: '', n: 10 });
  const [run, setRun] = useState(null); // { questions, i, answers: { [i]: { picked, result } }, wrong }
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => onBusy?.(run !== null), [run, onBusy]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ n: String(wrongOnly ? Math.max(1, Math.min(30, wrongCount)) : cfg.n) });
      if (wrongOnly) params.set('wrong', '1');
      if (cfg.topic && !wrongOnly) params.set('topic', cfg.topic);
      if (cfg.level && !wrongOnly) params.set('level', cfg.level);

      const { questions, wrongOnly: honored } = await fetchQuiz(params);
      if (wrongOnly && !honored) {
        setError('Máy chủ chưa hỗ trợ làm lại câu sai. Hãy khởi động lại API rồi thử lại.');
      } else if (!questions.length) {
        setError(wrongOnly ? 'Không còn câu sai nào để làm lại.' : 'Không đủ câu hỏi cho lựa chọn này.');
      } else {
        setRun({ questions, i: 0, answers: {}, wrong: [] });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wrongOnly) start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (opt) => {
    if (!run || run.answers[run.i]?.picked || answering) return;
    const q = run.questions[run.i];
    setAnswering(true);
    setError(null);
    try {
      const result = await answerQuiz({ cardId: q.cardId, chosenCardId: opt.cardId });
      setRun((r) => ({
        ...r,
        answers: { ...r.answers, [r.i]: { picked: opt.cardId, result } },
        wrong: result.correct ? r.wrong : [...r.wrong, q],
      }));
      qc.invalidateQueries({ queryKey: todayKeys.all });
      qc.invalidateQueries({ queryKey: quizKeys.wrong });
    } catch (e) {
      setError(e.message);
    } finally {
      setAnswering(false);
    }
  };

  const prev = () => run?.i > 0 && setRun((r) => ({ ...r, i: r.i - 1 }));
  const next = () => run && run.i < run.questions.length && setRun((r) => ({ ...r, i: r.i + 1 }));
  const jumpTo = (i) => run && i >= 0 && i < run.questions.length && setRun((r) => ({ ...r, i }));

  const quit = async () => {
    if (run.i > 0 && !(await dlg.confirm({ title: 'Thoát lượt làm bài', message: 'Thoát khỏi lượt này? Các câu đã làm vẫn được lưu.', confirmText: 'Thoát' }))) return;
    wrongOnly ? onExit?.() : setRun(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!run || run.i >= run.questions.length) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg-back, .sp-back')) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;

      const ans = run.answers[run.i];
      if (e.key === 'ArrowLeft') return prev();
      if (e.key === 'ArrowRight') return next();
      if (ans?.result && (e.key === 'Enter' || e.key === ' ')) return next();

      const k = e.key.toUpperCase();
      const idx = /^[1-9]$/.test(k) ? Number(k) - 1 : 'ABCD'.indexOf(k);
      const opt = idx >= 0 ? run.questions[run.i].options[idx] : null;
      if (opt && !ans?.picked && !answering) pick(opt);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // 1. Initial Setup Screen
  if (!run) {
    if (wrongOnly) {
      return (
        <div className="card center" style={{ maxWidth: 640, margin: '0 auto' }}>
          {loading ? <Spinner label="Đang chuẩn bị câu sai…" /> : (
            <>
              <p className={error ? 'err' : 'muted'}>{error ?? 'Đang chuẩn bị…'}</p>
              <button type="button" className="btn" onClick={onExit}>← Về sổ câu sai</button>
            </>
          )}
        </div>
      );
    }
    return <QuizSetup cfg={cfg} setCfg={setCfg} start={start} loading={loading} error={error} embedded={embedded} />;
  }

  const answeredCount = Object.keys(run.answers).length;
  const score = Object.values(run.answers).filter((a) => a.result?.correct).length;
  const progressPercent = Math.round((answeredCount / run.questions.length) * 100);

  // 2. Finished Result Screen
  if (run.i >= run.questions.length) {
    return (
      <QuizResult
        run={run}
        score={score}
        wrongOnly={wrongOnly}
        basket={basket}
        onReview={() => jumpTo(0)}
        onRestart={() => { basket.reset(); wrongOnly ? start() : setRun(null); }}
        onExit={onExit}
      />
    );
  }

  // 3. Active Quiz Question Screen
  const q = run.questions[run.i];
  const ans = run.answers[run.i];

  return (
    <div className="practice-container">
      {/* 1. Header Bar */}
      <div className="practice-header">
        <div className="practice-breadcrumb">
          <span className="mode-ic" style={{ fontSize: '1.1rem' }}>🧪</span>
          <span>{q.topicTitle}</span>
          <span>·</span>
          <b>{q.lessonTitle}</b>
        </div>
        <div className="practice-header-actions">
          <span className="tag" style={{ fontWeight: 700 }}>
            Đúng {score}/{answeredCount}
          </span>
          <button type="button" className="btn ghost small" disabled={run.i === 0} onClick={prev} title="Câu trước (←)">
            ←
          </button>
          <button type="button" className="btn ghost small" disabled={run.i >= run.questions.length - 1} onClick={next} title="Câu sau (→)">
            →
          </button>
          <button type="button" className="btn ghost small" onClick={quit} title="Thoát phiên làm bài">✕</button>
        </div>
      </div>

      {/* 2. Smooth Progress Bar */}
      <div className="practice-progress-track">
        <div className="practice-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* 3. Question Pills Tray */}
      <QuestionPills
        total={run.questions.length}
        current={run.i}
        getStatus={(idx) => (run.answers[idx]?.result?.correct ? 'ok' : run.answers[idx]?.result ? 'bad' : '')}
        onSelect={jumpTo}
      />

      {/* 4. Question Box */}
      <div className="practice-q-box">
        <div className="practice-q-meta">
          <span className="practice-q-badge">Câu {run.i + 1} / {run.questions.length}</span>
          <span className="muted small">Phím 1–4 hoặc A–D để chọn</span>
        </div>
        <div className="practice-q-text">
          <Markdown>{q.question}</Markdown>
        </div>
      </div>

      {error && <p className="err" style={{ marginBottom: 12 }}>Không gửi được đáp án: {error}. Hãy chọn lại.</p>}

      {/* 5. Modern Options */}
      <div className="practice-choices">
        {q.options.map((o, idx) => {
          let cls = 'practice-choice';
          if (ans?.result) {
            if (o.cardId === q.cardId) cls += ' is-right';
            else if (o.cardId === ans.picked) cls += ' is-wrong';
            else cls += ' is-dimmed';
          }
          return (
            <button
              key={o.cardId}
              type="button"
              className={cls}
              disabled={!!ans?.picked || answering}
              onClick={() => pick(o)}
            >
              <span className="practice-choice-key">{String.fromCharCode(65 + idx)}</span>
              <div className="practice-choice-body">
                <Markdown>{o.text}</Markdown>
              </div>
            </button>
          );
        })}
      </div>

      {/* 6. Feedback & Detailed Explanation Drawer */}
      {ans?.result && (
        <div className="practice-feedback">
          <div className={`practice-feedback-banner ${ans.result.correct ? 'ok' : 'bad'}`}>
            <span>{ans.result.correct ? '✓' : '✕'}</span>
            <span>{ans.result.correct ? 'Chính xác!' : 'Chưa chính xác'}</span>
          </div>

          {ans.result.explanation && (
            <div className="practice-feedback-exp">
              <div className="practice-feedback-exp-title">💡 Giải thích chuyên sâu:</div>
              <Markdown className="small">{ans.result.explanation}</Markdown>
            </div>
          )}

          {ans.result.nho && !ans.result.explanation && (
            <div className="practice-feedback-nho">
              <Markdown className="small">{`**Nhớ:** ${ans.result.nho}`}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* 7. Action Bar */}
      <div className="practice-actions">
        <button type="button" className="btn ghost" disabled={run.i === 0} onClick={prev}>
          ← Câu trước
        </button>

        <div className="row" style={{ gap: 8 }}>
          {ans?.result && (
            <Link to="/lessons/$lessonId" params={{ lessonId: String(q.lessonId) }} className="btn ghost">
              Mở bài gốc
            </Link>
          )}
          <button
            type="button"
            className="btn"
            disabled={!ans?.result && run.i >= run.questions.length - 1}
            onClick={next}
          >
            {run.i + 1 >= run.questions.length ? 'Xem kết quả 🎉' : 'Câu tiếp (Enter) →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizSetup({ cfg, setCfg, start, loading, error, embedded }) {
  return (
    <div style={embedded ? undefined : { maxWidth: 640, margin: '0 auto' }}>
      {loading && <Spinner overlay label="Đang tạo bộ câu hỏi…" />}
      {!embedded && (
        <PageHero
          tag="Luyện tập"
          title={<>Trắc nghiệm <em>nhanh</em></>}
          sub="Câu hỏi trắc nghiệm chuyên sâu 4 đáp án có giải thích chi tiết; câu sai được lưu vào sổ câu sai để ôn lại."
          icon="🧪"
        />
      )}
      <div className="card form-card stack setup-form">
        <div className="field"><span>Chủ đề</span>
          <TopicSelect value={cfg.topic} onChange={(v) => setCfg({ ...cfg, topic: v })} />
        </div>
        <div className="field"><span>Mức độ</span>
          <LevelSelect value={cfg.level} onChange={(v) => setCfg({ ...cfg, level: v })} />
        </div>
        <label className="field"><span>Số câu</span>
          <input
            type="number"
            min="1"
            max="30"
            value={cfg.n}
            onChange={(e) => setCfg({ ...cfg, n: Math.max(1, Math.min(30, Number(e.target.value) || 10)) })}
          />
        </label>
        {error && <p className="err">{error}</p>}
        <div className="row">
          <button className="btn" onClick={start} disabled={loading}>
            {loading ? 'Đang tạo…' : 'Bắt đầu'}
          </button>
          <Link to="/wrong" className="btn ghost">Sổ câu sai</Link>
        </div>
      </div>
    </div>
  );
}

function QuizResult({ run, score, wrongOnly, basket, onReview, onRestart, onExit }) {
  const percent = Math.round((score / run.questions.length) * 100);

  return (
    <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2>Kết quả: {score}/{run.questions.length} ({percent}%)</h2>
      <p className="muted">Nhấp vào từng câu bên dưới để xem lại đáp án và giải thích chi tiết:</p>

      <QuestionPills
        total={run.questions.length}
        current={-1}
        getStatus={(idx) => (run.answers[idx]?.result?.correct ? 'ok' : run.answers[idx]?.result ? 'bad' : '')}
        onSelect={onReview}
      />

      {run.wrong.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: 12 }}>Các câu sai (đã lưu vào Sổ câu sai):</p>
          <ul>
            {run.wrong.map((q) => (
              <li key={q.cardId}>
                <Link to="/lessons/$lessonId" params={{ lessonId: String(q.lessonId) }}>
                  {q.question.slice(0, 120)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginBottom: 12 }}>
            <button
              className="btn mint"
              disabled={basket.isPending || basket.isSuccess}
              onClick={() => basket.mutate({ cardIds: run.wrong.map((q) => q.cardId) })}
            >
              {basket.isSuccess ? '✓ Đã thêm vào giỏ' : `Thêm ${run.wrong.length} câu sai vào giỏ ôn tập`}
            </button>
            {basket.error && <span className="err small">{basket.error.message}</span>}
          </div>
        </>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className="btn ghost" onClick={onReview}>← Xem lại từ câu 1</button>
        <button className="btn" onClick={onRestart}>
          {wrongOnly ? 'Làm lại các câu còn sai' : 'Làm lượt mới'}
        </button>
        {wrongOnly && (
          <button type="button" className="btn ghost" onClick={onExit}>← Về sổ câu sai</button>
        )}
        <Link to="/basket" className="btn ghost">Xem giỏ bài</Link>
      </div>
    </div>
  );
}
