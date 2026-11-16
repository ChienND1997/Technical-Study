import { useEffect, useState } from 'react';
import { useTheme } from '@/shared/lib/theme.js';

let seq = 0;

/** Renders a mermaid diagram inside a lesson. The library is lazy-loaded (only when a lesson has a diagram). */
export default function Mermaid({ chart }) {
  const theme = useTheme();
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' });
        const out = await mermaid.render(`mmd-${++seq}`, chart);
        if (!cancelled) {
          setSvg(out.svg);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, theme]);

  if (err) {
    return (
      <pre className="code" title="Không vẽ được sơ đồ, hiển thị mã nguồn">
        {chart}
      </pre>
    );
  }
  if (!svg) return <div className="muted mermaid-loading">Đang vẽ sơ đồ…</div>;
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
