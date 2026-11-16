import { useEffect, useRef, useState } from 'react';
import { TEXT_COLORS } from '@/shared/lib/remarkColor.js';

/** Toolbar actions: wrap the selection (`wrap`) or prefix every selected line (`line`). */
const TOOLS = [
  { key: 'b', label: 'B', title: 'In đậm (Ctrl+B)', wrap: ['**', '**'], hint: 'in đậm', cls: 'b' },
  { key: 'i', label: 'I', title: 'In nghiêng (Ctrl+I)', wrap: ['*', '*'], hint: 'in nghiêng', cls: 'i' },
  { label: 'H', title: 'Tiêu đề nhỏ', line: '### ', hint: 'Tiêu đề' },
  { label: '•', title: 'Danh sách', line: '- ', hint: 'Mục danh sách' },
  { label: '1.', title: 'Danh sách đánh số', line: '1. ', hint: 'Mục đầu tiên' },
  { label: '❝', title: 'Trích dẫn', line: '> ', hint: 'Nội dung trích dẫn' },
  { label: '</>', title: 'Mã', wrap: ['`', '`'], hint: 'code' },
  { label: '🔗', title: 'Chèn liên kết (Ctrl+K)', link: true },
];

/**
 * Small Markdown editor: formatting toolbar + keyboard shortcuts over a textarea.
 * `value` and `onChange(text)` are plain Markdown, rendered by the shared Markdown component.
 */
export default function MarkdownEditor({ value, onChange, placeholder, rows = 8, maxLength = 5000 }) {
  const ref = useRef(null);
  const [palette, setPalette] = useState(false);
  const palRef = useRef(null);

  useEffect(() => {
    if (!palette) return undefined;
    const off = (e) => palRef.current && !palRef.current.contains(e.target) && setPalette(false);
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [palette]);

  /** Wraps the selection as {color|text}. */
  const color = (name) => {
    setPalette(false);
    apply({ wrap: [`{${name}|`, '}'], hint: 'chữ màu' });
  };

  /** Replaces the selected range and puts the caret/selection back after React re-renders. */
  const edit = (from, to, text, selStart, selEnd) => {
    const next = value.slice(0, from) + text + value.slice(to);
    onChange(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(selStart, selEnd);
    });
  };

  const apply = (t) => {
    const el = ref.current;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const sel = value.slice(a, b);
    if (t.wrap) {
      const [l, r] = t.wrap;
      const text = sel || t.hint;
      edit(a, b, l + text + r, a + l.length, a + l.length + text.length);
    } else if (t.line) {
      // every selected line gets the prefix (numbered lists count up)
      const start = value.lastIndexOf('\n', a - 1) + 1;
      const chunk = value.slice(start, b) || t.hint;
      const out = chunk.split('\n').map((ln, i) => (t.line === '1. ' ? `${i + 1}. ` : t.line) + ln).join('\n');
      edit(start, b, out, start, start + out.length);
    } else if (t.link) {
      const text = sel || 'văn bản liên kết';
      const url = 'https://';
      edit(a, b, `[${text}](${url})`, a + text.length + 3, a + text.length + 3 + url.length);
    }
  };

  const onKeyDown = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const t = k === 'k' ? TOOLS.at(-1) : TOOLS.find((x) => x.key === k);
    if (t) {
      e.preventDefault();
      apply(t);
    }
  };

  return (
    <div className="mde">
      <div className="mde-bar" role="toolbar" aria-label="Định dạng văn bản">
        {TOOLS.map((t) => (
          <button key={t.title} type="button" className={`mde-btn ${t.cls ?? ''}`} title={t.title} aria-label={t.title} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(t)}>
            {t.label}
          </button>
        ))}
        <span className="mde-pal" ref={palRef}>
          <button type="button" className="mde-btn" title="Màu chữ" aria-label="Màu chữ" aria-expanded={palette} onMouseDown={(e) => e.preventDefault()} onClick={() => setPalette((v) => !v)}>
            <span className="mde-a">A</span>
          </button>
          {palette && (
            <span className="mde-swatches" role="menu">
              {TEXT_COLORS.map((c) => (
                <button key={c.name} type="button" role="menuitem" title={c.label} aria-label={c.label} style={{ background: c.hex }} onMouseDown={(e) => e.preventDefault()} onClick={() => color(c.name)} />
              ))}
            </span>
          )}
        </span>
        <span className="mde-count">{value.length}/{maxLength}</span>
      </div>
      <textarea
        ref={ref} value={value} rows={rows} maxLength={maxLength} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      />
    </div>
  );
}
