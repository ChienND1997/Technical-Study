import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '@/features/auth/queries.js';
import MentionTextarea from '@/shared/components/MentionTextarea.jsx';
import { withMentions } from '@/shared/lib/mentions.jsx';
import { fetchMessages } from './api.js';
import {
  groupKeys,
  useAssignmentsQuery,
  useDeleteMessage,
  useMessagesQuery,
  useReactMessage,
  useSendMessage,
} from './queries.js';
import { REACTION_MAP, ReactionBadge, ReactionDetailsModal, ReactionPicker } from './Reactions.jsx';
import { useDialog } from '@/shared/components/Dialog.jsx';

const PAGE_SIZE = 50;
const time = (d) =>
  new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export default function ChatPanel({ groupId, myRole, members = [], compact = false, onSelectTask, targetMessageId }) {
  const dlg = useDialog();
  const nav = useNavigate();
  const me = useMeQuery().data?.user;
  const { data = [], isLoading } = useMessagesQuery(groupId);
  const { data: assignments = [] } = useAssignmentsQuery(groupId);
  const send = useSendMessage();
  const del = useDeleteMessage();
  const react = useReactMessage();

  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);
  const [pickedTasks, setPickedTasks] = useState([]);
  const [pickerId, setPickerId] = useState(null);
  const [localReactions, setLocalReactions] = useState({});
  const [detailsReactions, setDetailsReactions] = useState(null);
  const [highlightId, setHighlightId] = useState(targetMessageId ? Number(targetMessageId) : null);
  const hoverTimerRef = useRef(null);

  const openPicker = (id) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setPickerId(id);
  };
  const closePicker = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setPickerId(null);
    }, 280);
  };

  const candidates = members.filter((m) => m.id !== me?.id);
  const boxRef = useRef(null);
  const endRef = useRef(null);
  const listRef = useRef(null);
  const qc = useQueryClient();

  const [older, setOlder] = useState([]);
  const [noMore, setNoMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const all = [...older.filter((o) => !data.some((m) => m.id === o.id)), ...data];

  async function loadOlder() {
    const first = all[0];
    if (!first || loadingOlder) return;
    const box = listRef.current;
    const prev = box?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const page = await fetchMessages(groupId, first.id);
      if (page.length < PAGE_SIZE) setNoMore(true);
      setOlder((o) => [...page, ...o]);
      requestAnimationFrame(() => { if (box) box.scrollTop = box.scrollHeight - prev; });
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [data.at(-1)?.id]);

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: groupKeys.list });
  }, [data, qc]);

  useEffect(() => {
    if (!targetMessageId) return;
    const tid = Number(targetMessageId);
    setHighlightId(tid);
    const t = setTimeout(() => {
      const el = document.getElementById(`msg-${tid}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    const clearTimer = setTimeout(() => setHighlightId(null), 3000);
    return () => {
      clearTimeout(t);
      clearTimeout(clearTimer);
    };
  }, [targetMessageId, all.length]);

  function handleTaskClick(taskId) {
    if (onSelectTask) {
      onSelectTask(taskId);
    } else {
      try { sessionStorage.setItem(`kt-group-tab-${groupId}`, 'tasks'); } catch {}
      nav({ to: '/groups/$id', params: { id: String(groupId) } });
    }
  }

  async function handleReact(mid, reaction) {
    const cur = localReactions[mid] !== undefined ? localReactions[mid] : all.find((x) => x.id === mid)?.reactions || [];
    const existing = cur.find((r) => r.user_id === me?.id);
    let updated;
    if (existing && existing.reaction === reaction) {
      updated = cur.filter((r) => r.user_id !== me?.id);
    } else if (existing) {
      updated = cur.map((r) => (r.user_id === me?.id ? { ...r, reaction } : r));
    } else {
      updated = [...cur, { reaction, user_id: me?.id, user_name: me?.name || 'Tôi' }];
    }
    setLocalReactions((prev) => ({ ...prev, [mid]: updated }));
    try {
      await react.mutateAsync({ id: groupId, mid, reaction });
    } catch {
      setLocalReactions((prev) => {
        const next = { ...prev };
        delete next[mid];
        return next;
      });
    }
  }

  async function submit(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || send.isPending) return;

    const mentionIds = picked.filter((u) => body.includes(`@${u.name}`)).map((u) => u.id);
    const taskIds = pickedTasks
      .filter((t) => body.includes(`#[${t.title}]`) || body.includes(`#${t.title}`) || body.includes(t.title))
      .map((t) => t.id);

    setText('');
    setPicked([]);
    setPickedTasks([]);
    try {
      await send.mutateAsync({ id: groupId, body, mentionIds, taskIds });
    } catch {
      setText(body);
    }
  }

  return (
    <div className={`card chat ${compact ? 'compact' : ''}`}>
      <div className="chat-list" ref={listRef}>
        {isLoading && <p className="muted small">Đang tải…</p>}
        {!isLoading && all.length === 0 && (
          <p className="muted small chat-empty">Chưa có tin nhắn. Hãy chào cả nhóm nhé 👋</p>
        )}
        {!noMore && (older.length > 0 || data.length >= PAGE_SIZE) && (
          <button type="button" className="chat-more" disabled={loadingOlder} onClick={loadOlder}>
            {loadingOlder ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}
        {all.map((m) => {
          const mine = m.user_id === me?.id;
          const reactions = localReactions[m.id] !== undefined ? localReactions[m.id] : (m.reactions || []);
          const myReaction = reactions?.find((r) => r.user_id === me?.id)?.reaction;

          return (
            <div key={m.id} id={`msg-${m.id}`} className={`msg ${mine ? 'mine' : ''} ${highlightId === m.id ? 'msg-highlight' : ''}`}>
              {!mine && (
                <Link to="/users/$userId" params={{ userId: String(m.user_id) }} className={`comment-av ${m.author_blocked ? 'blocked' : ''}`}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" referrerPolicy="no-referrer" /> : (m.author || '?').slice(0, 1).toUpperCase()}
                </Link>
              )}
              <div className="msg-bubble">
                {!mine && <Link to="/users/$userId" params={{ userId: String(m.user_id) }} className="msg-author" style={{ textDecoration: 'none' }}><b>{m.author}</b></Link>}
                <span className="msg-text">{withMentions(m.body, m.mentions, m.task_mentions, handleTaskClick)}</span>

                {m.task_mentions?.map((t) => (
                  <div key={t.id} className="msg-task" role="button" onClick={() => handleTaskClick(t.id)}>
                    <b>📋 {t.title}</b>
                    {t.dueDate && <small>Hạn: {new Date(t.dueDate).toLocaleDateString('vi-VN')}</small>}
                  </div>
                ))}

                <ReactionBadge
                  reactions={reactions}
                  myUserId={me?.id}
                  onOpenDetails={() => setDetailsReactions(reactions)}
                />

                <div className="msg-meta">
                  <span className="msg-time">{time(m.created_at)}</span>
                  {!mine && (
                    <div
                      className="react-btn-wrap"
                      onMouseEnter={() => openPicker(m.id)}
                      onMouseLeave={closePicker}
                    >
                      <button
                        type="button"
                        className={`link-btn react-btn ${myReaction ? 'active' : ''}`}
                        style={myReaction ? { color: REACTION_MAP[myReaction]?.color, fontWeight: 700 } : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReact(m.id, myReaction ? myReaction : 'like');
                        }}
                      >
                        {myReaction ? `${REACTION_MAP[myReaction]?.emoji} ${REACTION_MAP[myReaction]?.label}` : '👍 Thích'}
                      </button>

                      {pickerId === m.id && (
                        <ReactionPicker
                          onReact={(r) => {
                            handleReact(m.id, r);
                            setPickerId(null);
                          }}
                          onClose={() => setPickerId(null)}
                          onMouseEnter={() => openPicker(m.id)}
                          onMouseLeave={closePicker}
                        />
                      )}
                    </div>
                  )}
                  {(mine || me?.isAdmin) && (
                    <button
                      type="button"
                      className="link-btn danger"
                      onClick={async () => {
                        if (await dlg.confirm({ message: 'Xóa tin nhắn này?', confirmText: 'Xóa', danger: true })) {
                          del.mutate({ id: groupId, mid: m.id }, { onSuccess: () => setOlder((o) => o.filter((x) => x.id !== m.id)) });
                        }
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="chat-tools">
        {assignments.length > 0 && (
          <select
            className="chat-task-select"
            value=""
            onChange={(e) => {
              const t = assignments.find((x) => String(x.id) === e.target.value);
              if (t) {
                setPickedTasks((p) => [...p, t]);
                boxRef.current?.insert(`#[${t.title}]`);
              }
            }}
          >
            <option value="" disabled>📋 Gắn thẻ bài tập…</option>
            {assignments.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <MentionTextarea
          ref={boxRef}
          value={text}
          onChange={setText}
          onPick={(u) => setPicked((p) => (p.some((x) => x.id === u.id) ? p : [...p, u]))}
          candidates={candidates}
          taskCandidates={assignments}
          onPickTask={(t) => setPickedTasks((p) => (p.some((x) => x.id === t.id) ? p : [...p, t]))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
          rows={1}
          maxLength={1000}
          placeholder={compact ? 'Nhập tin nhắn… (@ thành viên, # bài tập)' : 'Nhập tin nhắn… (@ thành viên, # bài tập, Enter để gửi)'}
        />
        <button className="btn" type="submit" disabled={!text.trim() || send.isPending}>Gửi</button>
      </form>

      {detailsReactions && (
        <ReactionDetailsModal
          reactions={detailsReactions}
          onClose={() => setDetailsReactions(null)}
        />
      )}
    </div>
  );
}
