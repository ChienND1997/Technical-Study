# Kemtech

Web học technical theo từng ngày, lấy nội dung từ `D:\Technical study\docs-v2`. Backend Node.js (Fastify), frontend React + TanStack (Router, Query), database PostgreSQL, migration bằng file SQL.

## Cấu trúc thư mục
- `content/`: tracks.json (lộ trình), topics.json (tên và mô tả chủ đề)
- `apps/api/`: Node.js: migrate, ingest từ docs-v2, REST API, SRS
- `apps/web/`: React + Vite SPA
- `docs-v2/`: Ngân hàng tài liệu markdown, chia theo chủ đề và cấp độ
- `db/migrations/`: File SQL migration tự động chạy khi khởi động

## Chạy dự án (local)
1. Khởi động DB: `docker compose up -d db`
2. Mở terminal API: `cd apps/api && npm run dev`
3. Mở terminal Web: `cd apps/web && npm run dev`
4. Mở http://localhost:5173

## Deploy production
Xem [docs/DEPLOY.md](docs/DEPLOY.md) — chạy toàn bộ bằng `docker compose build && docker compose up -d` (db + api + web/nginx), kèm checklist cấu hình `.env`, bảo mật, backup và cập nhật.
