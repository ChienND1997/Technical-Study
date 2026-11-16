/** Placeholder shown while a page loads. */
export default function PageSkeleton() {
  return (
    <div className="skel" aria-busy="true" aria-label="Đang tải">
      <div className="skel-line tall w40" />
      <div className="skel-card">
        <div className="skel-line w85" />
        <div className="skel-line w70" />
        <div className="skel-line w55" />
      </div>
      <div className="skel-card">
        <div className="skel-line w70" />
        <div className="skel-line w85" />
        <div className="skel-line w40" />
      </div>
    </div>
  );
}
