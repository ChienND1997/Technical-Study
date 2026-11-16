import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import Markdown from '@/shared/components/Markdown.jsx';
import PageHero from '@/shared/components/PageHero.jsx';
import TopicSelect from '@/shared/components/TopicSelect.jsx';
import LevelSelect from '@/shared/components/LevelSelect.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import { useDialog } from '@/shared/components/Dialog.jsx';
import { useAddToBasket } from '@/features/review/queries.js';
import QuestionPills from '@/features/practice/QuestionPills.jsx';
import { finishMock, startMock } from './api.js';
import { useMockHistoryQuery } from './queries.js';

const SCORES = [
  { s: 0, label: 'Chưa trả lời được', hint: 'bí hoặc sai ý chính' },
  { s: 1, label: 'Cơ bản', hint: 'đúng ý chính, thiếu lý do' },
  { s: 2, label: 'Vững', hint: 'giải thích được cơ chế' },
  { s: 3, label: 'Sâu', hint: 'trả lời cả câu hỏi xoáy, nêu đánh đổi' },
];

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function MockPage({ embedded = false, initialTopic = '', onBusy }) {
  const dlg = useDialog();
  const qc = useQueryClient();
  const basket = useAddToBasket();

  const [cfg, setCfg] = useState({ topic: initialTopic ?? '', level: '', n: 5 });
  const [run, setRun] = useState(null); // { cards, i, reveals: { [i]: bool }, answers: { [i]: score } }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const t0 = useRef(0);
  const finishing = useRef(false);
  const { data: history } = useMockHistoryQuery();

  useEffect(() => {
    if (!run || result) return undefined;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [run, result]);

  useEffect(() => onBusy?.(run !== null && !result), [run, result, onBusy]);

  const start = async () => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams({ n: String(cfg.n) });
    if (cfg.topic) params.set('topic', cfg.topic);
    if (cfg.level) params.set('level', cfg.level);
    try {
      const { cards } = await startMock(params);
      if (!cards.length) return setError('Không có câu hỏi phù hợp.');
      t0.current = Date.now();
      finishing.current = false;
      setElapsed(0);
      setResult(null);
      setRun({ cards, i: 0, reveals: {}, answers: {} });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const prev = () => run?.i > 0 && setRun((r) => ({ ...r, i: r.i - 1 }));
  const next = () => run && run.i < run.cards.length - 1 && setRun((r) => ({ ...r, i: r.i + 1 }));
  const jumpTo = (idx) => run && idx >= 0 && idx < run.cards.length && setRun((r) => ({ ...r, i: idx }));
  const reveal = () => setRun((r) => ({ ...r, reveals: { ...r.reveals, [r.i]: true } }));

  const grade = (score) => {
    if (!run) return;
    setRun((r) => ({
      ...r,
      answers: { ...r.answers, [r.i]: score },
      reveals: { ...r.reveals, [r.i]: true },
      i: r.i >= r.cards.length - 1 ? r.i : r.i + 1,
    }));
  };

  const finishSession = async () => {
    if (!run || finishing.current) return;
    finishing.current = true;
    const durationSec = Math.round((Date.now() - t0.current) / 1000);
    const answersList = run.cards.map((c, idx) => ({ cardId: c.id, score: run.answers[idx] ?? 0 }));
    try {
      await finishMock({ scope: cfg.topic || null, durationSec, answers: answersList });
      qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    }
    setResult({ answers: answersList, durationSec, cards: run.cards });
  };

  const quit = async () => {
    if (run && !(await dlg.confirm({ title: 'Thoát buổi phỏng vấn', message: 'Thoát khỏi phiên phỏng vấn này?', confirmText: 'Thoát' }))) return;
    setRun(null);
    setResult(null);
  };

  // Keyboard navigation: Left/Right nav, Space/Enter reveal, 0-3 grade
  useEffect(() => {
    if (!run || result) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg-back, .sp-back')) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;

      const isRevealed = run.reveals[run.i];
      if (e.key === 'ArrowLeft') return prev();
      if (e.key === 'ArrowRight') return next();
      if ((e.key === ' ' || e.key === 'Enter') && !isRevealed) {
        e.preventDefault();
        return reveal();
      }
      if (['0', '1', '2', '3'].includes(e.key) && isRevealed) {
        e.preventDefault();
        return grade(Number(e.key));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // 1. Result View
  if (result) {
    return (
      <MockResult
        result={result}
        basket={basket}
        onReview={() => { setResult(null); jumpTo(0); }}
        onRestart={() => { basket.reset(); setRun(null); setResult(null); }}
        error={error}
      />
    );
  }

  // 2. Setup Screen
  if (!run) {
    return <MockSetup cfg={cfg} setCfg={setCfg} start={start} loading={loading} error={error} history={history} embedded={embedded} />;
  }

  // 3. Active Interview Question
  const c = run.cards[run.i];
  const isRevealed = !!run.reveals[run.i];
  const currentScore = run.answers[run.i];
  const isLast = run.i >= run.cards.length - 1;
  const gradedCount = Object.keys(run.answers).length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header bar */}
      <div className="row between" style={{ alignItems: 'center', marginBottom: 10 }}>
        <span className="muted small" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.topic_title} · {c.lesson_title}
        </span>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn ghost small" disabled={run.i === 0} onClick={prev} title="Câu trước (←)">
            ← Trước
          </button>
          <span className="tag" style={{ fontWeight: 600 }}>
            Câu {run.i + 1}/{run.cards.length}
          </span>
          <button type="button" className="btn ghost small" disabled={isLast} onClick={next} title="Câu sau (→)">
            Sau →
          </button>
          <span className="tag" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            ⏱ {mmss(elapsed)}
          </span>
          <button type="button" className="btn ghost small" onClick={quit} title="Thoát">✕</button>
        </div>
      </div>

      {/* Shared Question Pills */}
      <QuestionPills
        total={run.cards.length}
        current={run.i}
        getStatus={(idx) => (run.answers[idx] >= 2 ? 'ok' : run.answers[idx] !== undefined ? 'bad' : '')}
        onSelect={jumpTo}
      />

      {/* Question Card */}
      <div className="q-card">
        <span className="q-label">Câu hỏi phỏng vấn {run.i + 1}</span>
        <Markdown>{c.front}</Markdown>
      </div>

      {/* Answer & Self-grading Card */}
      <div className="card" style={{ marginTop: 14 }}>
        {!isRevealed ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p className="muted" style={{ marginBottom: 16 }}>
              Hãy tập <b>trả lời thành tiếng</b> như đang ngồi trước người phỏng vấn thật.
            </p>
            <button className="btn" style={{ padding: '12px 24px', fontSize: '1rem' }} onClick={reveal}>
              🎙️ Tôi đã trả lời xong, xem đáp án gợi ý (Space)
            </button>
          </div>
        ) : (
          <div>
            <div style={{ paddingBottom: 12 }}>
              <div className="small muted" style={{ fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎯 Đáp án & Gợi ý trả lời:
              </div>
              <Markdown>{c.back}</Markdown>

              {c.extra?.nho && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981' }}>
                  <span className="small" style={{ fontWeight: 700, color: '#047857' }}>
                    🔑 Điểm mấu chốt để đạt mức Sâu (Điểm 3):
                  </span>
                  <div className="small" style={{ marginTop: 4 }}>
                    <Markdown>{c.extra.nho}</Markdown>
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 10 }}>
              <p className="a-label" style={{ marginBottom: 10 }}>
                Bạn tự đánh giá câu trả lời của mình ở mức nào? (phím 0–3)
              </p>
              <div className="rate">
                {SCORES.map((x) => (
                  <button
                    key={x.s}
                    type="button"
                    className={currentScore === x.s ? 'active' : ''}
                    onClick={() => grade(x.s)}
                  >
                    <b>{x.label} ({x.s}đ)</b>
                    <small>{x.hint}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="row between" style={{ marginTop: 16, alignItems: 'center' }}>
          <button type="button" className="btn ghost" disabled={run.i === 0} onClick={prev}>
            ← Câu trước
          </button>
          <div className="row" style={{ gap: 8 }}>
            {!isLast ? (
              <button type="button" className="btn ghost" onClick={next}>
                Câu sau →
              </button>
            ) : (
              <button type="button" className="btn" onClick={finishSession} disabled={gradedCount === 0}>
                Hoàn tất buổi phỏng vấn ({gradedCount}/{run.cards.length} câu) ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSetup({ cfg, setCfg, start, loading, error, history, embedded }) {
  return (
    <div style={embedded ? undefined : { maxWidth: 680, margin: '0 auto' }}>
      {loading && <Spinner overlay label="Đang chuẩn bị câu hỏi…" />}
      {!embedded && (
        <PageHero
          tag="Luyện tập"
          title={<>Phỏng vấn <em>thử</em></>}
          sub="Tập phản xạ trả lời thành tiếng trước, sau đó đối chiếu đáp án chuẩn và tự chấm điểm 0–3."
          icon="🎤"
        />
      )}
      <div className="card form-card stack setup-form">
        <div className="field"><span>Chủ đề</span>
          <TopicSelect value={cfg.topic} onChange={(v) => setCfg({ ...cfg, topic: v })} />
        </div>
        <div className="field"><span>Mức độ</span>
          <LevelSelect value={cfg.level} onChange={(v) => setCfg({ ...cfg, level: v })} />
        </div>
        <label className="field"><span>Số câu hỏi</span>
          <input
            type="number"
            min="1"
            max="30"
            value={cfg.n}
            onChange={(e) => setCfg({ ...cfg, n: Math.max(1, Math.min(30, Number(e.target.value) || 5)) })}
          />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn" onClick={start} disabled={loading}>
          {loading ? 'Đang chuẩn bị…' : 'Bắt đầu phỏng vấn'}
        </button>
      </div>

      {history?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <b>Lịch sử các buổi phỏng vấn</b>
          {history.map((h) => (
            <div key={h.id} className="sec-row">
              <span className="sec-title small">
                {new Date(h.started_at).toLocaleString('vi-VN')} · {h.scope ?? 'Tất cả'} · {h.questions} câu
              </span>
              <span className="tag" style={{ fontWeight: 700 }}>{h.avg_score}/3</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MockResult({ result, basket, onReview, onRestart, error }) {
  const avg = result.answers.reduce((a, x) => a + x.score, 0) / result.answers.length;
  const weakIds = result.answers.filter((a) => a.score <= 1).map((a) => a.cardId);

  return (
    <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2>Kết thúc phiên · Điểm trung bình: {avg.toFixed(2)}/3</h2>
      <p className="muted">Tổng thời gian luyện tập: {mmss(result.durationSec)}.</p>

      <div style={{ margin: '14px 0' }}>
        <QuestionPills
          total={result.cards.length}
          current={-1}
          getStatus={(idx) => (result.answers[idx]?.score >= 2 ? 'ok' : 'bad')}
          onSelect={onReview}
        />
      </div>

      {weakIds.length > 0 && (
        <div className="row" style={{ marginBottom: 14 }}>
          <button
            className="btn mint"
            disabled={basket.isPending || basket.isSuccess}
            onClick={() => basket.mutate({ cardIds: weakIds })}
          >
            {basket.isSuccess ? '✓ Đã thêm vào giỏ' : `Thêm ${weakIds.length} câu chấm 0–1 vào giỏ ôn tập`}
          </button>
          {basket.error && <span className="err small">{basket.error.message}</span>}
        </div>
      )}

      {result.cards.map((c, i) => (
        <div key={c.id} className="sec-row">
          <span className="tag" style={{ minWidth: 140, textAlign: 'center' }}>
            {SCORES[result.answers[i].score].label} ({result.answers[i].score}đ)
          </span>
          <span className="sec-title small">{c.front.slice(0, 140)}</span>
        </div>
      ))}

      {error && <p className="err">{error}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className="btn ghost" onClick={onReview}>← Xem lại từ câu 1</button>
        <button className="btn" onClick={onRestart}>Bắt đầu phiên mới</button>
        <Link to="/basket" className="btn ghost">Xem giỏ bài</Link>
      </div>
    </div>
  );
}
