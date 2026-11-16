/** Text colors the editor offers; the Markdown syntax is {name|colored text}. */
export const TEXT_COLORS = [
  { name: 'red', label: 'Đỏ', hex: '#dc2626' },
  { name: 'orange', label: 'Cam', hex: '#ea580c' },
  { name: 'green', label: 'Xanh lá', hex: '#16a34a' },
  { name: 'blue', label: 'Xanh dương', hex: '#2563eb' },
  { name: 'purple', label: 'Tím', hex: '#7c3aed' },
  { name: 'gray', label: 'Xám', hex: '#64748b' },
];

const NAMES = TEXT_COLORS.map((c) => c.name).join('|');
const TOKEN = new RegExp(`(\\{(?:${NAMES})\\||\\})`);
const OPEN = new RegExp(`^\\{(${NAMES})\\|$`);

/** Splits a list of sibling nodes into colored spans. Inline code and code blocks are left alone (not text nodes). */
function colorize(children) {
  const root = { children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  for (const node of children) {
    if (node.type !== 'text') {
      top().children.push(node);
      continue;
    }
    for (const part of node.value.split(TOKEN)) {
      if (part === '') continue;
      const open = part.match(OPEN);
      if (open) {
        const span = { type: 'emphasis', data: { hName: 'span', hProperties: { className: [`c-${open[1]}`] } }, children: [], raw: part };
        top().children.push(span);
        stack.push(span);
      } else if (part === '}' && stack.length > 1) {
        stack.pop();
      } else {
        top().children.push({ type: 'text', value: part });
      }
    }
  }
  // an unclosed "{red|" is shown literally, followed by what it would have colored
  while (stack.length > 1) {
    const span = stack.pop();
    const parent = top();
    const at = parent.children.indexOf(span);
    parent.children.splice(at, 1, { type: 'text', value: span.raw }, ...span.children);
  }
  return root.children;
}

function walk(node) {
  if (!node.children) return;
  node.children.forEach(walk);
  if (node.children.some((c) => c.type === 'text' && c.value.includes('|') || c.type === 'text' && c.value.includes('}'))) {
    node.children = colorize(node.children);
  }
}

/** Remark plugin: turns {red|text} into <span class="c-red">text</span> without allowing raw HTML. */
export default function remarkColor() {
  return (tree) => walk(tree);
}
