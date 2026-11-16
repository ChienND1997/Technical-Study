import { useEffect } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside `ref` while it is mounted, focuses its first control and restores the previous focus on unmount. */
export function useFocusTrap(ref) {
  useEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    const previous = document.activeElement;
    box.querySelector(FOCUSABLE)?.focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...box.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [ref]);
}
