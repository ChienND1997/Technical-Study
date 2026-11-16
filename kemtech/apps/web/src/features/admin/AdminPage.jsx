import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner from '@/shared/components/Spinner.jsx';
import NotFound from '@/shared/components/NotFound.jsx';
import { useMeQuery } from '@/features/auth/queries.js';
import { usePendingCount } from '@/features/blog/queries.js';
import { runIngest } from './api.js';
import UsersPanel from './UsersPanel.jsx';
import ReviewPanel from './ReviewPanel.jsx';
import AnnouncementsPanel from './AnnouncementsPanel.jsx';

/** Admin console: users, blog moderation, content ingest. */
export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('users');
  const isAdmin = !!useMeQuery().data?.user?.isAdmin;
  const pending = usePendingCount(isAdmin).data?.count ?? 0;
  const ingest = useMutation({ mutationFn: runIngest, meta: { success: 'Đã nạp lại nội dung' }, onSuccess: () => qc.invalidateQueries() });

  // non-admins get the same 404 as an unknown URL
  if (!isAdmin) return <NotFound />;

  return (
    <div>
      {ingest.isPending && <Spinner overlay label="Đang nạp lại nội dung…" />}
      <h1>Quản trị</h1>
      <div className="tabs" role="tablist">
        <button className={`tab ${tab === 'users' ? 'on' : ''}`} onClick={() => setTab('users')}>👥 Người dùng</button>
        <button className={`tab ${tab === 'blog' ? 'on' : ''}`} onClick={() => setTab('blog')}>
          📝 Duyệt bài{pending > 0 && <span className="tab-n">{pending}</span>}
        </button>
        <button className={`tab ${tab === 'announcements' ? 'on' : ''}`} onClick={() => setTab('announcements')}>📢 Thông báo</button>
        <button className={`tab ${tab === 'content' ? 'on' : ''}`} onClick={() => setTab('content')}>📚 Nội dung</button>
      </div>

      {tab === 'users' && <UsersPanel />}
      {tab === 'blog' && <ReviewPanel />}
      {tab === 'announcements' && <AnnouncementsPanel />}
      {tab === 'content' && (
        <div className="card stack">
          <b>Nạp lại nội dung</b>
          <p className="muted small" style={{ margin: 0 }}>Đọc lại thư mục tài liệu và cập nhật chủ đề, bài học, thẻ, lộ trình.</p>
          <div><button className="btn" onClick={() => ingest.mutate()} disabled={ingest.isPending}>Chạy ingest</button></div>
          {ingest.error && <p className="err">{ingest.error.message}</p>}
          {ingest.data && <pre>{ingest.data.log.join('\n')}</pre>}
        </div>
      )}
    </div>
  );
}
