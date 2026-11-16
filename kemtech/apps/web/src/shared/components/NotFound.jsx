import { Link } from '@tanstack/react-router';

export default function NotFound() {
  return (
    <div className="card error-box">
      <div className="error-face" aria-hidden="true">🧭</div>
      <h2>Không tìm thấy trang</h2>
      <p className="muted">Trang bạn tìm không tồn tại, đã bị chuyển đi hoặc bạn không có quyền xem.</p>
      <Link to="/" className="btn">← Về trang chủ</Link>
    </div>
  );
}
