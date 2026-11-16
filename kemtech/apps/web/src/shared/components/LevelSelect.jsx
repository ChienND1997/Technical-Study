import { LEVELS } from '@/shared/lib/format.js';

const OPTIONS = [{ value: '', label: 'Tất cả' }, ...Object.entries(LEVELS).map(([value, label]) => ({ value, label }))];

/** Segmented difficulty filter. `value` is '' (all) or '1' | '2' | '3'; `onChange` gets the same kind of string. */
export default function LevelSelect({ value, onChange }) {
  const current = value == null ? '' : String(value);
  return (
    <div className="seg" role="radiogroup" aria-label="Mức độ">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={current === o.value} className={current === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
