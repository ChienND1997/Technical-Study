/**
 * Modern Question Navigator Pills (1..N) used in Quiz and Mock Interview.
 */
export default function QuestionPills({ total, current = -1, getStatus, onSelect }) {
  return (
    <div className="practice-pills-tray">
      {Array.from({ length: total }, (_, i) => {
        const status = getStatus?.(i) ?? '';
        return (
          <button
            key={i}
            type="button"
            className={`practice-pill ${i === current ? 'active' : ''} ${status}`}
            onClick={() => onSelect(i)}
            title={`Câu ${i + 1}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
