import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from '@/shared/api/client.js';
import { LEVELS } from '@/shared/lib/format.js';
import Logo from '@/shared/components/Logo.jsx';
import Icon from '@/shared/components/Icon.jsx';
import Markdown from '@/shared/components/Markdown.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import AnnouncementPopup from '@/features/announcements/AnnouncementPopup.jsx';

/** Menu shown to visitors: every entry except "Hôm nay" needs an account, so it leads to the sign-in page. */
const NAV = [
  { to: '/', label: 'Hôm nay', icon: 'home' },
  { to: '/tracks', label: 'Lộ trình', icon: 'map', locked: true },
  { to: '/topics', label: 'Chủ đề', icon: 'book', locked: true },
  { to: '/practice', label: 'Luyện tập', icon: 'check', locked: true },
  { to: '/groups', label: 'Nhóm học tập', icon: 'group', locked: true },
  { to: '/blog', label: 'Blog', icon: 'blog', locked: true },
];

const FEATURES = [
  { icon: '🗺️', title: 'Lộ trình từng ngày', text: 'Mỗi ngày một phần vừa sức, chia theo giai đoạn để biết mình đang ở đâu.' },
  { icon: '📚', title: 'Thư viện theo chủ đề', text: 'Java, Spring Boot, Database, DevOps, System Design, Frontend… chia Easy / Medium / Hard.' },
  { icon: '🧺', title: 'Giỏ bài ôn tập', text: 'Chỉ thêm những gì bạn muốn nhớ, ôn lặp lại đúng lúc sắp quên.' },
  { icon: '🧪', title: 'Luyện tập và sổ câu sai', text: 'Trắc nghiệm nhanh, phỏng vấn thử, làm lại các câu từng sai.' },
  { icon: '👥', title: 'Học cùng nhau', text: 'Lập nhóm, trò chuyện, giao bài tập và theo dõi tiến độ của nhau.' },
  { icon: '✍️', title: 'Blog cộng đồng', text: 'Đọc, bình luận, trích dẫn và chia sẻ bài viết của chính bạn.' },
];

const STEPS = ['Đăng nhập bằng Google hoặc tài khoản được cấp', 'Chọn mục tiêu học mỗi ngày', 'Học, luyện tập, ôn lại và giữ chuỗi ngày học'];

/** Modal with the first part of a featured lesson; the rest needs an account. */
function PreviewModal({ id, onClose }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['public-preview', id], queryFn: () => api(`/public/preview/${id}`) });
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="pv-backdrop" onClick={onClose} role="presentation">
      <div className="pv-modal card" role="dialog" aria-modal="true" aria-label="Xem thử bài học" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pv-close" onClick={onClose} aria-label="Đóng">×</button>
        {isLoading && <Spinner />}
        {error && <p className="err">{error.message}</p>}
        {data && (
          <>
            <div className="muted small">{data.lesson.topic_title} · {data.lesson.minutes} phút · {data.lesson.sections} phiên</div>
            <h2 style={{ margin: '4px 0 12px' }}>{data.lesson.title}</h2>
            <div className="pv-body">
              {data.sections.map((s) => (
                <section key={s.ord}>
                  <h3>{s.heading}</h3>
                  <Markdown>{s.body_md}</Markdown>
                </section>
              ))}
              {data.truncated && <div className="pv-fade" aria-hidden="true" />}
            </div>
            <div className="pv-cta">
              <b>Thích bài này? Đăng nhập để đọc tiếp và lưu tiến độ.</b>
              <Link to="/login" className="btn">Đăng nhập để học tiếp</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** "Học thử": featured lessons visitors can read the beginning of. */
function TrySection() {
  const [open, setOpen] = useState(null);
  const { data = [] } = useQuery({ queryKey: ['public-preview'], queryFn: () => api('/public/preview'), staleTime: 300000 });
  if (data.length === 0) return null; // nothing to show (content not ingested yet, or the API is down)
  return (
    <section>
      <h2 className="guest-h">Học thử miễn phí</h2>
      <p className="muted" style={{ marginTop: -6 }}>Đọc phần đầu của vài bài mẫu. Thấy hay thì đăng nhập để học tiếp.</p>
      <div className="guest-grid">
        {data.map((l) => (
          <button key={l.id} type="button" className="card guest-card try-card" onClick={() => setOpen(l.id)}>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip">{l.topic_title}</span>
              <span className={`tag l${l.level}`}>{LEVELS[l.level]}</span>
            </div>
            <b>{l.title}</b>
            {l.summary?.[0] && <p className="muted small"><Markdown className="inline">{l.summary[0]}</Markdown></p>}
            <span className="try-link">Xem thử · {l.minutes} phút →</span>
          </button>
        ))}
      </div>
      {open && <PreviewModal id={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/**
 * Public landing page for visitors without an account. It is the only page they can see ("Hôm nay");
 * the real study content needs a sign-in.
 */
export default function GuestHome() {
  return (
    <div className="app guest">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand"><Logo /></Link>
          <nav className="nav" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} activeProps={{ className: 'active' }} title={n.locked ? `${n.label} (cần đăng nhập)` : n.label}>
                <Icon name={n.icon} />
                <span className="nav-label">{n.label}</span>
                {n.locked && <span className="nav-lock" aria-hidden="true">🔒</span>}
              </Link>
            ))}
          </nav>
          <div className="topbar-right">
            <Link to="/login" className="btn small">Đăng nhập</Link>
          </div>
        </div>
      </header>
      <AnnouncementPopup />

      <main className="wrap main guest-main">
        <section className="guest-hero">
          <span className="guest-tag">Học technical mỗi ngày</span>
          <h1>Hôm nay bạn học gì?</h1>
          <p>KemTech giúp bạn học kiến thức kỹ thuật đều đặn: lộ trình rõ ràng, bài ngắn vừa sức, ôn tập đúng lúc và học cùng bạn bè.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/login" className="btn">Đăng nhập để bắt đầu</Link>
          </div>
          <p className="muted small">Bạn đang xem với tư cách khách. Các mục có biểu tượng 🔒 cần đăng nhập mới xem được.</p>
        </section>

        <TrySection />

        <section>
          <h2 className="guest-h">Bạn sẽ có gì khi đăng nhập</h2>
          <div className="guest-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="card guest-card">
                <span className="guest-ic" aria-hidden="true">{f.icon}</span>
                <b>{f.title}</b>
                <p className="muted small">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card guest-steps">
          <h2 className="guest-h" style={{ marginTop: 0 }}>Bắt đầu chỉ với 3 bước</h2>
          <ol>
            {STEPS.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
          </ol>
          <Link to="/login" className="btn">Đăng nhập ngay</Link>
        </section>
      </main>

      <footer className="foot"><span>© {new Date().getFullYear()} KemTech. All rights reserved.</span></footer>
    </div>
  );
}
