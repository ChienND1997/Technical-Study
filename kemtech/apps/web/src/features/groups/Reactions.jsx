import { useEffect, useRef, useState } from 'react';

export const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Thích', color: '#2563eb' },
  { key: 'love', emoji: '❤️', label: 'Yêu thích', color: '#e11d48' },
  { key: 'haha', emoji: '😂', label: 'Haha', color: '#f59e0b' },
  { key: 'wow', emoji: '😮', label: 'Wow', color: '#f59e0b' },
  { key: 'sad', emoji: '😢', label: 'Buồn', color: '#f59e0b' },
  { key: 'angry', emoji: '😡', label: 'Phẫn nộ', color: '#ea580c' },
];

export const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

/** Thanh chọn 6 cảm xúc FB */
export function ReactionPicker({ onReact, onClose, onMouseEnter, onMouseLeave }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [onClose]);

  return (
    <div
      className="react-picker"
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          className="react-picker-btn"
          title={r.label}
          onClick={(e) => {
            e.stopPropagation();
            onReact(r.key);
            onClose?.();
          }}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
}

/** Huy hiệu FB hiển thị icon và tổng số react */
export function ReactionBadge({ reactions = [], myUserId, onOpenDetails }) {
  if (!reactions?.length) return null;

  const uniqueEmojis = [];
  const seen = new Set();
  for (const r of reactions) {
    const emoji = REACTION_MAP[r.reaction]?.emoji || '👍';
    if (!seen.has(emoji)) {
      seen.add(emoji);
      uniqueEmojis.push(emoji);
    }
  }

  const hasMine = reactions.some((r) => r.user_id === myUserId);
  const title = reactions
    .map((r) => `${r.user_name || 'Thành viên'}: ${REACTION_MAP[r.reaction]?.label || r.reaction}`)
    .join('\n');

  return (
    <button
      type="button"
      className={`react-badge ${hasMine ? 'mine' : ''}`}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetails?.();
      }}
    >
      <span className="react-badge-emojis">{uniqueEmojis.slice(0, 3).join('')}</span>
      <span className="react-badge-count">{reactions.length}</span>
    </button>
  );
}

/** Modal chi tiết danh sách người đã thả cảm xúc */
export function ReactionDetailsModal({ reactions = [], onClose }) {
  const [tab, setTab] = useState('all');

  const filterTabs = [
    { key: 'all', label: `Tất cả (${reactions.length})` },
    ...REACTIONS.map((r) => {
      const count = reactions.filter((x) => x.reaction === r.key).length;
      return count > 0 ? { key: r.key, label: `${r.emoji} ${count}` } : null;
    }).filter(Boolean),
  ];

  const displayed = tab === 'all' ? reactions : reactions.filter((x) => x.reaction === tab);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dlg-back" onClick={onClose}>
      <div className="dlg react-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="react-dlg-head">
          <b>Người đã thả cảm xúc</b>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="react-dlg-tabs">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`react-dlg-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="react-dlg-list">
          {displayed.map((r, idx) => (
            <div key={`${r.user_id}-${idx}`} className="react-dlg-item">
              <span className="comment-av">
                {(r.user_name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="react-dlg-name">{r.user_name || 'Thành viên'}</span>
              <span className="react-dlg-emoji" title={REACTION_MAP[r.reaction]?.label}>
                {REACTION_MAP[r.reaction]?.emoji || '👍'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
