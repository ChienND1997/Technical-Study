/** Friendly error panel for a failed query/mutation. `error` is an Error or a string. */
export default function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Đã có lỗi xảy ra';
  return (
    <div className="card error-box" role="alert">
      <div className="error-face" aria-hidden="true">😵</div>
      <h2>Có lỗi xảy ra</h2>
      <p className="muted">{msg}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
