/** Highlight @mentions và #task mentions trong tin nhắn */
export function withMentions(text, mentions = [], taskMentions = [], onTaskClick) {
  if (!text) return '';
  const names = (mentions || []).map((m) => m.name).filter(Boolean);
  const tasks = (taskMentions || []).map((t) => t.title).filter(Boolean);
  if (!names.length && !tasks.length) return text;

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = [
    ...names.map((n) => `(@${esc(n)})`),
    ...tasks.map((t) => `(#\\[${esc(t)}\\]|#${esc(t)})`),
  ];
  // Each token already parenthesizes itself; wrapping the whole alternation in one more capturing
  // group made `split()` return every matched group per hit (the outer one and the one token that
  // matched), so one "@name" in the text rendered as two identical mention pills.
  const re = new RegExp(tokens.join('|'), 'g');

  return text.split(re).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('@') && names.includes(part.slice(1))) {
      return <span key={i} className="mention">{part}</span>;
    }
    if (part.startsWith('#')) {
      const title = part.startsWith('#[') ? part.slice(2, -1) : part.slice(1);
      const task = taskMentions.find((t) => t.title === title);
      if (task) {
        return (
          <span key={i} className="task-tag" role="button" onClick={() => onTaskClick?.(task.id)}>
            📋 {title}
          </span>
        );
      }
    }
    return part;
  });
}
