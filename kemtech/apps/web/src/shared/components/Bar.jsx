/** Thin progress bar: `.bar` track with an inner `<i>` filled to value/max. */
export default function Bar({ value = 0, max = 100, label = '' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div
      className="bar"
      role="progressbar"
      aria-label={label || undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      title={label ? `${label}: ${value}/${max}` : `${value}/${max}`}
    >
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
