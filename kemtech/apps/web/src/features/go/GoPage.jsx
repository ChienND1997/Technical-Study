import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { resolveLink } from './api.js';

/** Redirect page for cross-lesson links: /go?p=<path inside docs-v2> */
export default function GoPage() {
  const { p } = useSearch({ strict: false });
  const navigate = useNavigate();
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    resolveLink(p)
      .then(({ to }) => {
        // `to` is a concrete path (e.g. /lessons/12), so navigate by href instead of a route template
        if (!cancelled) navigate({ href: to, replace: true });
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [p, navigate]);

  if (err) return <p className="err">Không mở được liên kết ({p}): {err}</p>;
  return <p className="muted">Đang mở…</p>;
}
