import { useEffect, useRef, useState } from 'react';

const MAX = 300;
export const QUOTE_EVENT = 'kt-quote';

/**
 * Wraps article content: selecting text inside shows a floating button that quotes the selection
 * into the comment box below (the comment form listens for QUOTE_EVENT).
 */
export default function QuoteSelector({ children }) {
  const box = useRef(null);
  const [pick, setPick] = useState(null); // { text, x, y }

  useEffect(() => {
    function onChange() {
      const sel = window.getSelection();
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!sel || sel.isCollapsed || !text || !box.current?.contains(sel.anchorNode) || !box.current.contains(sel.focusNode)) {
        setPick(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setPick({ text: text.slice(0, MAX), x: Math.min(Math.max(r.left + r.width / 2, 80), window.innerWidth - 80), y: Math.max(r.top - 8, 60) });
    }
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, []);

  function quote() {
    window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail: { text: pick.text } }));
    window.getSelection()?.removeAllRanges();
    setPick(null);
  }

  return (
    <div ref={box}>
      {children}
      {pick && (
        <button type="button" className="quote-pop" style={{ left: pick.x, top: pick.y }} onMouseDown={(e) => e.preventDefault()} onClick={quote}>
          ❝ Trích dẫn vào bình luận
        </button>
      )}
    </div>
  );
}
