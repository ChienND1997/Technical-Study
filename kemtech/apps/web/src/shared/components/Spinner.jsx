/** Loading indicator. `overlay` covers the screen (used while a mutation runs); otherwise it fills the page area. */
export default function Spinner({ overlay = false, label }) {
  return (
    <div className={overlay ? 'spin-overlay' : 'spin-page'} role="status" aria-live="polite">
      <div className="spinner" />
      {label && <div className="spin-label">{label}</div>}
    </div>
  );
}
