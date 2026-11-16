import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkColor from '@/shared/lib/remarkColor.js';
import Mermaid from '@/shared/components/Mermaid.jsx';

const HIGHLIGHT = [rehypeHighlight, { detect: false, ignoreMissing: true }];

const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props?.children);
};

/** Fenced code blocks: ```mermaid becomes a diagram, everything else a highlighted `pre.code`. */
function Pre({ children }) {
  const code = Array.isArray(children) ? children[0] : children;
  const cls = code?.props?.className ?? '';
  if (/\blanguage-mermaid\b/.test(cls)) return <Mermaid chart={textOf(code.props.children).replace(/\n$/, '')} />;
  return <pre className="code">{children}</pre>;
}

const COMPONENTS = { pre: Pre };

/**
 * Renders Markdown inside `.md`. `className` adds modifiers (`inline` drops paragraph margins, `small`, ...);
 * `colors` enables the {red|text} color syntax used by announcements.
 */
export default function Markdown({ children, className = '', colors = false }) {
  return (
    <div className={`md ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={colors ? [remarkGfm, remarkColor] : [remarkGfm]} rehypePlugins={[HIGHLIGHT]} components={COMPONENTS}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
