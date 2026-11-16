import { useEffect, useRef } from 'react';

const SRC = 'https://accounts.google.com/gsi/client';

/** Loads Google Identity Services once and renders the official sign-in button. */
export default function GoogleButton({ clientId, onCredential }) {
  const box = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !box.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) });
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'vi' });
    };
    if (window.google?.accounts?.id) init();
    else {
      let s = document.querySelector(`script[src="${SRC}"]`);
      if (!s) {
        s = document.createElement('script');
        s.src = SRC;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener('load', init);
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);
  return <div ref={box} className="google-btn" />;
}
