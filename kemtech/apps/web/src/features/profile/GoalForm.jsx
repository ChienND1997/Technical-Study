import { useState } from 'react';
import TopicSelect from '@/shared/components/TopicSelect.jsx';
import { useSaveGoal } from './queries.js';

const MINUTES = [30, 60, 90, 120];
const DIFFICULTY = [
  { v: 'mixed', label: 'Tự động', hint: 'Lẫn các mức' },
  { v: 'easy', label: 'Dễ', hint: 'Chỉ bài Easy' },
  { v: 'medium', label: 'Trung bình', hint: 'Chỉ bài Medium' },
  { v: 'hard', label: 'Khó', hint: 'Chỉ bài Hard' },
];

/**
 * Daily minutes, topic to study and difficulty. Used on the Today page and in the profile.
 * `onSkip` adds a secondary button for users who do not want to set a goal.
 */
export default function GoalForm({ initial, onSaved, submitLabel = 'Lưu mục tiêu', onSkip, skipLabel }) {
  const [minutes, setMinutes] = useState(initial?.dailyMinutes ?? 30);
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'mixed');
  const save = useSaveGoal();

  const submit = (e) => {
    e.preventDefault();
    save.mutate({ dailyMinutes: Number(minutes), topic: topic || null, difficulty }, { onSuccess: onSaved });
  };

  return (
    <form className="goal-form" onSubmit={submit}>
      <div className="field">
        <span>Mỗi ngày học bao nhiêu phút?</span>
        <div className="chips">
          {MINUTES.map((m) => (
            <button type="button" key={m} className={`opt ${Number(minutes) === m ? 'on' : ''}`} onClick={() => setMinutes(m)}>{m} phút</button>
          ))}
          <label className="opt custom">
            <input type="number" min="5" max="480" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Số phút mỗi ngày" /> phút
          </label>
        </div>
      </div>

      <div className="field">
        <span>Hôm nay muốn học chủ đề gì?</span>
        <TopicSelect value={topic} onChange={setTopic} allLabel="Tất cả chủ đề (ngẫu nhiên)" />
      </div>

      <div className="field">
        <span>Độ khó ưu tiên</span>
        <div className="chips">
          {DIFFICULTY.map((d) => (
            <button type="button" key={d.v} className={`opt ${difficulty === d.v ? 'on' : ''}`} onClick={() => setDifficulty(d.v)} title={d.hint}>{d.label}</button>
          ))}
        </div>
      </div>

      {save.error && <p className="err">{save.error.message}</p>}
      <div className="row">
        <button className="btn" type="submit" disabled={save.isPending || Number(minutes) < 5}>{submitLabel}</button>
        {onSkip && <button className="btn ghost" type="button" onClick={onSkip}>{skipLabel}</button>}
      </div>
    </form>
  );
}
