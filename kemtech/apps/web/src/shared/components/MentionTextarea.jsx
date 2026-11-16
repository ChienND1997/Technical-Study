import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useUserSearch } from '@/features/notifications/queries.js';

const TOKEN = /(?:^|\s)([@#])([^\s@#]{0,30})$/;

/**
 * Textarea hỗ trợ gợi ý @thành_viên và #bài_tập.
 */
const MentionTextarea = forwardRef(function MentionTextarea(
  { value, onChange, onPick, candidates, taskCandidates, onPickTask, onKeyDown, ...rest },
  ref
) {
  const box = useRef(null);
  const [match, setMatch] = useState(null); // { type: '@' | '#', query: string }

  const remote = useUserSearch(candidates || match?.type !== '@' ? '' : match.query).data ?? [];
  const users = (candidates || remote)
    .filter((u) => !match?.query || u.name.toLowerCase().includes(match.query.toLowerCase()))
    .slice(0, 8);
  const tasks = (taskCandidates || [])
    .filter((t) => !match?.query || t.title.toLowerCase().includes(match.query.toLowerCase()))
    .slice(0, 8);

  const list = match?.type === '#' ? tasks : users;

  useImperativeHandle(ref, () => ({
    focus: () => box.current?.focus(),
    insert: (str) => {
      const at = box.current ? box.current.selectionStart : value.length;
      onChange(`${value.slice(0, at)}${str} ${value.slice(at)}`);
      box.current?.focus();
    },
  }));

  function type(e) {
    const v = e.target.value;
    onChange(v);
    const m = TOKEN.exec(v.slice(0, e.target.selectionStart));
    setMatch(m ? { type: m[1], query: m[2] } : null);
  }

  function choose(item) {
    const at = box.current ? box.current.selectionStart : value.length;
    const isTask = match?.type === '#';
    const start = value.slice(0, at).replace(/[@#][^\s@#]{0,30}$/, '');
    onChange(`${start}${isTask ? `#[${item.title}]` : `@${item.name}`} ${value.slice(at)}`);
    if (isTask) onPickTask?.(item);
    else onPick?.(item);
    setMatch(null);
    box.current?.focus();
  }

  function keys(e) {
    if (match && list.length > 0 && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      choose(list[0]);
      return;
    }
    if (e.key === 'Escape') setMatch(null);
    onKeyDown?.(e);
  }

  return (
    <div className="mention-box">
      {match && list.length > 0 && (
        <div className="mention-list" role="listbox">
          {list.map((item) => (
            <button key={item.id} type="button" className="mention-opt" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}>
              {match.type === '#' ? (
                <><span>📋</span><span>{item.title}</span></>
              ) : (
                <>
                  <span className="comment-av">
                    {item.avatarUrl || item.avatar_url ? (
                      <img src={item.avatarUrl || item.avatar_url} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      item.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span>{item.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
      <textarea ref={box} value={value} onChange={type} onKeyDown={keys} {...rest} />
    </div>
  );
});

export default MentionTextarea;
