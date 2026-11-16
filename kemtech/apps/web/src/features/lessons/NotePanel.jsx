import { useEffect, useRef, useState } from 'react';
import { saveNote } from './api.js';
import { useSaveNote } from './queries.js';

/** Personal note for a lesson: autosaves shortly after typing stops and flushes unsaved text on unmount. */
export default function NotePanel({ lessonId, initial }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const latest = useRef({ text: initial, dirty: false });
  const save = useSaveNote(lessonId, {
    onSuccess: () => {
      latest.current.dirty = false;
      setSaved(true);
    },
  });
  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    setSaved(false);
    latest.current = { text: v, dirty: true };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(v), 800); // autosave after the user stops typing
  };
  // Leaving the page with unsaved changes: save them now so no text is lost.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (latest.current.dirty) {
        saveNote(lessonId, latest.current.text).catch(() => {});
      }
    },
    [lessonId],
  );
  return (
    <div className="card">
      <b>Ghi chú của tôi</b>
      <textarea value={text} onChange={onChange} placeholder="Ghi lại chỗ chưa hiểu, ví dụ riêng…" />
      <span className="muted small">{saved ? 'Đã lưu' : 'Đang lưu…'}</span>
    </div>
  );
}
