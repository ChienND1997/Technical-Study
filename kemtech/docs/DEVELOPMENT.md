# Hướng dẫn phát triển

## Chạy local
1. Khởi động DB: `docker compose up -d db`
2. API: `cd apps/api && npm install && npm run dev` (cổng 3000, tự migrate khi khởi động)
3. Web: `cd apps/web && npm install && npm run dev` (cổng 5173)
4. Mở http://localhost:5173, đăng nhập bằng `ADMIN_USER` / `ADMIN_PASSWORD` trong `.env` (mặc định `admin` / `123456`).

## Nạp nội dung
`cd apps/api && npm run ingest` để nạp lại `docs-v2` vào DB (hoặc đặt `INGEST_ON_START=true`). Có thể nạp lại từ giao diện admin.

## Lệnh hữu ích
| Lệnh | Tác dụng |
|---|---|
| `npm run migrate` (apps/api) | chạy các migration chưa áp dụng |
| `npm test` (apps/api) | chạy test bằng `node:test` |
| `npm run build` (apps/web) | build web |
| `npm run lint:comments` (gốc) | kiểm tra quy ước comment |

## Biến môi trường (`.env`)
`DATABASE_URL`, `API_PORT`, `CONTENT_DIR`, `AUTO_MIGRATE`, `INGEST_ON_START`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET`. Mẫu ở `.env.example`.

## Gỡ lỗi
- Lỗi 500 được ghi ra terminal API dưới dạng `[api] METHOD URL -> 500: ...` kèm mã lỗi Postgres và vị trí trong SQL.
- Migration được bỏ qua theo tên file; không so sánh checksum.
