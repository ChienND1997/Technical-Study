import Markdown from '@/shared/components/Markdown.jsx';
import { KINDS } from './kinds.js';

/**
 * The announcement as the reader sees it: colored header with the kind badge, title, then the body
 * in a soft panel. Used by the popup and by the live preview in the admin editor.
 */
export default function AnnouncementCard({ kind, title, body, onClose, footer }) {
  const k = KINDS[kind] ?? KINDS.info;
  return (
    <div className={`ann-card ann-${k.tone}`}>
      {onClose && <button type="button" className="ann-card-x" onClick={onClose} aria-label="Đóng" title="Đóng">×</button>}
      <div className="ann-card-head">
        <span className="ann-card-badge">{k.icon} {k.label}</span>
        <h2>{title || 'Tiêu đề thông báo'}</h2>
      </div>
      <div className="ann-card-body">
        {body ? <Markdown className="ann-card-md" colors>{body}</Markdown> : <p className="muted">Nội dung sẽ hiện ở đây.</p>}
      </div>
      {footer && <div className="ann-card-foot">{footer}</div>}
    </div>
  );
}
