# Xác thực (Auth)

## Phiên đăng nhập
- Phiên **stateless**: cookie `kt_session` (HttpOnly, SameSite=Lax, Path=/) chứa token ký HMAC-SHA256 bằng `SESSION_SECRET`. Không có bảng session, không dùng JWT hay thư viện ngoài.
- Thời hạn lấy từ `sessionTtlDays` (config). Token hết hạn hoặc sai chữ ký → coi như chưa đăng nhập.
- Mật khẩu băm bằng **scrypt** (`node:crypto`), lưu dạng `scrypt$<salt hex>$<hash hex>` trong `users.password_hash`.

## Cách đăng nhập
| Endpoint | Dùng cho |
|---|---|
| `POST /api/auth/login` | email hoặc tên + mật khẩu (tài khoản do admin tạo); cũng nhận `ADMIN_USER/ADMIN_PASSWORD` |
| `POST /api/auth/admin` | tài khoản admin trong `.env` |
| `POST /api/auth/google` | Google id_token, kiểm qua `oauth2.googleapis.com/tokeninfo` (đối chiếu `aud` = `GOOGLE_CLIENT_ID`) |
| `POST /api/auth/logout` | xóa cookie |
| `GET /api/auth/me` | thông tin người dùng hiện tại |

## Vai trò
- `user` và `admin`. Email nằm trong `ADMIN_EMAILS` (phân tách bằng dấu phẩy) tự có quyền admin.
- Tài khoản admin môi trường (`ADMIN_USER`, mặc định `admin`) được tạo vào bảng `users` ở lần đăng nhập đầu.
- Tài khoản `active = false` hoặc đã xóa mềm (`deleted_at`) không đăng nhập được.

## Phân quyền ở API
Hook `attachAuth` (`http/request-context.js`) chạy cho mọi request và gán `req.user`, `req.userId`:
- Mọi `/api/*` cần đăng nhập (401), trừ `/api/health`, `/api/auth/*`, `/api/public/*`.
- Mọi `/api/admin/*` cần vai trò admin (403).
- Route handler không cần tự kiểm tra quyền.

## Biến môi trường
`ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET` (xem `.env.example`). Đổi `SESSION_SECRET` ở môi trường thật.
