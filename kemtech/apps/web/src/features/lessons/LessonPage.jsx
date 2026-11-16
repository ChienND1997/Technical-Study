import ErrorBox from '@/shared/components/ErrorBox.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { LEVELS } from '@/shared/lib/format.js';
import Markdown from '@/shared/components/Markdown.jsx';
import { useCompleteSection } from '@/features/progress/queries.js';
import { useAddToBasket } from '@/features/review/queries.js';
import Comments from '@/features/blog/Comments.jsx';
import QuoteSelector from '@/features/blog/QuoteSelector.jsx';
import { useLessonQuery } from './queries.js';
import { readPos, saveLast, savePos } from './lastRead.js';
import Spinner from '@/shared/components/Spinner.jsx';
import PageSkeleton from '@/shared/components/PageSkeleton.jsx';

export default function LessonPage() {
  const { lessonId } = useParams({ strict: false });
  const { s } = useSearch({ strict: false });
  const complete = useCompleteSection();
  const basket = useAddToBasket();
  const { data, isLoading, error } = useLessonQuery(lessonId);

  const [progress, setProgress] = useState(0); // 0..100, how far down the page the reader is
  const [active, setActive] = useState(null); // ord of the section currently being read
  const [resumed, setResumed] = useState(null); // heading we jumped back to, for the small notice
  const [focusMode, setFocusMode] = useState(false); // distraction-free reader mode
  const activeRef = useRef(null);
  activeRef.current = active;

  // Scroll to the requested section (?s=ord); without one, go back to where the learner stopped last time
  useEffect(() => {
    if (!data) return;
    window.scrollTo({ top: 0 });
    setResumed(null);
    let target = s;
    if (target === undefined) {
      const saved = readPos(lessonId);
      const sec = data.sections.find((x) => x.ord === saved);
      if (sec && sec.ord !== data.sections[0]?.ord) {
        target = sec.ord;
        setResumed(sec.heading);
      }
    }
    if (target !== undefined) {
      const el = document.getElementById(`sec-${target}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    saveLast({ lessonId: Number(lessonId), title: data.lesson.title, ord: target ?? data.sections[0]?.ord, heading: null });
  }, [lessonId, s, data?.lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading progress bar + the section in view (highlighted in the table of contents, remembered for next time)
  useEffect(() => {
    if (!data) return undefined;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, Math.round((window.scrollY / h) * 100)) : 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null);
        const visible = [...seen].filter(([, top]) => top !== null).sort((a, b) => a[1] - b[1]);
        const id = visible[0]?.[0];
        if (id) {
          const ord = Number(id.replace('sec-', ''));
          setActive(ord);
          savePos(lessonId, ord);
        }
      },
      { rootMargin: '-72px 0px -55% 0px' },
    );
    data.sections.forEach((x) => {
      const el = document.getElementById(`sec-${x.ord}`);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, [lessonId, data?.lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} />;
  const { lesson, sections, cards, prev, next } = data;
  const doneCount = sections.filter((x) => x.done).length;

  return (
    <div>
      <div className="read-bar" role="progressbar" aria-label="Tiến độ đọc" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }} /></div>
      {resumed && (
        <div className="resume-note" role="status">
          <span>Đã đưa bạn về chỗ đang đọc dở: <b>{resumed}</b></span>
          <button type="button" className="link-btn" onClick={() => { setResumed(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Lên đầu bài</button>
        </div>
      )}
      <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
        <p style={{ margin: 0 }}><Link to="/topics/$slug" params={{ slug: lesson.topic_slug }}>← {lesson.topic_title}</Link></p>
        <button
          type="button"
          className={`btn small ${focusMode ? 'mint' : 'ghost'}`}
          onClick={() => setFocusMode((v) => !v)}
          title={focusMode ? 'Quay lại chế độ xem đầy đủ' : 'Bật chế độ tập trung không xao nhãng'}
        >
          {focusMode ? '✕ Thoát tập trung' : '📖 Tập trung đọc'}
        </button>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <h1 style={{ margin: 0 }}>{lesson.title}</h1>
        {lesson.level && <span className={`tag l${lesson.level}`}>{LEVELS[lesson.level]}</span>}
      </div>
      <p className="muted small">{lesson.minutes} phút · {doneCount}/{sections.length} phiên đã xong</p>

      <div className={`lesson-layout ${focusMode ? 'focus-mode' : ''}`}>
        <div>
          {lesson.summary?.length > 0 && (
            <div className="card summary-box">
              <b>Tóm tắt nhanh</b>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {lesson.summary.map((x, i) => <li key={i}><Markdown className="inline">{x}</Markdown></li>)}
              </ul>
            </div>
          )}

          <QuoteSelector>
          {sections.map((sec, i) => {
            // sessions go in order: needs every earlier one done, and can only be unticked from the end
            const blocked = sec.done ? sections.slice(i + 1).some((x) => x.done) : !sections.slice(0, i).every((x) => x.done);
            return (
            <article key={sec.id} id={`sec-${sec.ord}`} className="card section-card">
              <h2>
                <span>{sec.heading}</span>
                <span className="muted small">{sec.minutes}′</span>
              </h2>
              <Markdown>{sec.body_md}</Markdown>
              <div className="done-bar row">
                <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sec.done}
                    disabled={complete.isPending || blocked}
                    onChange={(e) => complete.mutate({ id: sec.id, done: e.target.checked })}
                  />
                  <span>{sec.done ? 'Đã học xong phiên này' : blocked ? 'Hoàn thành phiên trước để mở khóa' : 'Đánh dấu đã học xong'}</span>
                </label>
              </div>
            </article>
            );
          })}
          </QuoteSelector>

          <nav className="lesson-nav" aria-label="Bài trước và bài sau">
            {prev ? (
              <Link to="/lessons/$lessonId" params={{ lessonId: String(prev.id) }} className="ln prev">
                <small>← Bài trước</small><b>{prev.title}</b>
              </Link>
            ) : <span />}
            {next ? (
              <Link to="/lessons/$lessonId" params={{ lessonId: String(next.id) }} className={`ln next ${doneCount === sections.length ? 'ready' : ''}`}>
                <small>{doneCount === sections.length ? 'Đã xong bài này, học tiếp →' : 'Bài sau →'}</small><b>{next.title}</b>
              </Link>
            ) : <span />}
          </nav>
          <Comments type="lesson" id={lesson.id} />
        </div>

        <aside className="side stack">
          <div className="card">
            <b>Mục lục</b>
            <nav className="toc" style={{ marginTop: 6 }}>
              {sections.map((sec) => (
                <a key={sec.id} href={`#sec-${sec.ord}`} className={active === sec.ord ? 'cur' : ''} aria-current={active === sec.ord ? 'true' : undefined}>
                  <span className={`ck ${sec.done ? 'on' : ''}`}>{sec.done ? '✓' : '○'}</span>
                  <span>{sec.heading}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="card">
            <b>Ôn tập bài này</b>
            <p className="muted small" style={{ margin: '4px 0 8px' }}>
              {cards.total === 0
                ? 'Bài này chưa có nội dung để ôn tập.'
                : `${cards.in_basket}/${cards.total} bài đã nằm trong giỏ.`}
            </p>
            {cards.total > cards.in_basket && (
              <button className="btn mint" disabled={basket.isPending} onClick={() => basket.mutate({ lessonId: lesson.id })}>
                Thêm {cards.total - cards.in_basket} bài vào giỏ
              </button>
            )}
            {basket.isSuccess && <p className="small" style={{ color: 'var(--ok)' }}>Đã thêm {basket.data.added} bài vào giỏ.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}