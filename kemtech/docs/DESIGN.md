# Thiết kế hệ thống

## Tổng quan
Web học technical theo từng ngày. Monorepo gồm `apps/api` (Fastify 5 + pg + zod) và `apps/web` (React 18 + Vite + TanStack Router/Query), cơ sở dữ liệu PostgreSQL 16.

## Luồng dữ liệu
1. Nội dung nằm ở thư mục `docs-v2` (markdown theo chủ đề và cấp độ easy/medium/hard).
2. `npm run ingest` (hoặc `INGEST_ON_START=true`) parse markdown thành `topics`, `lessons`, `sections`, `cards` trong DB. Lộ trình và mô tả chủ đề lấy từ `content/tracks.json`, `content/topics.json`.
3. API phục vụ nội dung, tiến độ, ôn tập, trò chơi hóa và nhóm học.
4. Web gọi `/api/*` (Vite proxy ở môi trường dev).

## Các module API
- **Danh tính**: `auth`, `admin`, `announcements`, `profile`.
- **Nội dung và lộ trình**: `content`, `tracks`, `plan`, `today`, `dashboard`.
- **Học và ôn**: `progress`, `review` (SRS), `quiz`, `mock`, `practice`, `stats`.
- **Trò chơi hóa**: `game` (cấp độ, huy hiệu), `activity` (XP, thời gian, streak theo ngày).
- **Xã hội**: `groups`, `blog`, `notification`, `realtime`.

## Ôn tập ngắt quãng (SRS)
Thuật toán kiểu SM-2 trong `review/srs.js`; thẻ nằm trong giỏ ôn (`basket`), trả lời qua `/api/review/answer`.

## Trang Hôm nay / Dashboard
`GET /api/dashboard` gồm dữ liệu của `/api/today` (streak, XP, thẻ đến hạn, giỏ ôn, mục tiêu, ngày học của lộ trình) cộng `plan` (danh sách học hôm nay), `week`, `weekCal`, `recent`, `topics`. Danh sách hằng ngày lưu thành track ẩn `daily-<userId>`.

## Cơ sở dữ liệu
Schema do `db/migrations` tạo (31 bảng sau 21 migration). Migration chạy tự động khi API khởi động (`AUTO_MIGRATE=false` để tắt).
