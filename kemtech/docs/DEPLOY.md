# Deploy (production)

Tài liệu này mô tả cách triển khai Kemtech lên một máy chủ (VPS/on-prem) bằng Docker Compose — đúng với `docker-compose.yml` đã có sẵn ở gốc repo. Không cần cài Node/Postgres trực tiếp trên máy chủ, chỉ cần Docker.

## 1. Kiến trúc

```
                ┌────────────────────┐
 80/443 ──────▶ │ web (nginx + SPA)  │── /api/* ──▶ api (Fastify, :3000) ──▶ db (Postgres 16)
   (proxy)      └────────────────────┘                     │
                                                              └── đọc docs-v2 (ro) để ingest nội dung
```

- **web**: build React (Vite) thành file tĩnh, phục vụ bằng Nginx; Nginx cũng proxy `/api/` sang service `api` (cùng origin → không lo CORS/cookie).
- **api**: Fastify, tự chạy migration SQL khi khởi động, có thể tự ingest nội dung khi khởi động.
- **db**: Postgres 16, dữ liệu lưu ở volume `kemtech_pgdata`.
- **docs-v2**: thư mục Markdown nội dung học, nằm **ngoài** repo (mặc định `../docs-v2` so với thư mục `kemtech/`), mount read-only vào container `api`.

### Giới hạn cần biết trước khi scale
Thông báo/presence realtime (`realtime/presence.hub.js`) giữ danh sách socket **trong bộ nhớ của một tiến trình** — xem `docs/REALTIME.md`. Vì vậy **chỉ chạy 1 instance `api`**. Muốn chạy nhiều instance (load balancing) phải thêm cơ chế pub/sub (ví dụ Redis) trước — ngoài phạm vi tài liệu này.

## 2. Yêu cầu trước khi deploy

- Máy chủ Linux (khuyến nghị) với **Docker** ≥ 24 và **Docker Compose plugin** (`docker compose version`).
- Thư mục nội dung `docs-v2` đã có sẵn trên máy chủ (copy hoặc `git clone`/`rsync` từ nơi lưu nội dung gốc).
- Tên miền trỏ về máy chủ nếu cần HTTPS công khai (xem mục 7).
- Mở cổng cần dùng trên firewall: `80`/`443` (hoặc cổng bạn chọn cho `web`). **Không** mở cổng `5432` (DB) và `3000` (API) ra Internet — xem mục 8.

## 3. Lấy mã nguồn và nội dung

```bash
git clone <repo-url> kemtech
cd kemtech

# nội dung học nằm cạnh thư mục kemtech (đúng mặc định CONTENT_DIR_HOST=../docs-v2)
git clone <repo-noi-dung-docs-v2> ../docs-v2
# hoặc: rsync -a /nguon/docs-v2/ ../docs-v2/
```

Nếu muốn đặt `docs-v2` ở chỗ khác, set `CONTENT_DIR_HOST` trong `.env` (xem mục 4) trỏ đúng đường dẫn tuyệt đối hoặc tương đối so với file `docker-compose.yml`.

## 4. Cấu hình `.env`

```bash
cp .env.example .env
```

Sửa các giá trị sau — **bắt buộc đổi** trước khi chạy thật (khác với giá trị mặc định dùng cho dev):

| Biến | Ý nghĩa | Khuyến nghị production |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Tài khoản Postgres | Đặt mật khẩu mạnh, không dùng `kemtech`/`kemtech` mặc định |
| `SESSION_SECRET` | Khóa ký cookie phiên đăng nhập (HMAC) | Chuỗi ngẫu nhiên dài, ví dụ `openssl rand -hex 32` |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Tài khoản admin được tạo tự động ở lần đăng nhập đầu | Đổi `ADMIN_PASSWORD`, không để `123456` |
| `ADMIN_EMAILS` | Email tự động có quyền admin khi đăng nhập Google | Điền email thật nếu dùng đăng nhập Google |
| `GOOGLE_CLIENT_ID` | Bật đăng nhập Google | Để trống nếu không dùng |
| `CONTENT_DIR_HOST` | Đường dẫn `docs-v2` trên máy host | Mặc định `../docs-v2`, đổi nếu đặt chỗ khác |
| `WEB_PORT` | Cổng `web` (nginx) expose ra host | Mặc định `8080`; nếu chạy sau một reverse proxy khác thì giữ nguyên và không mở ra ngoài trực tiếp |
| `API_PORT`, `DB_PORT` | Cổng `api`/`db` expose ra host | Chỉ cần cho debug; nên bỏ hẳn phần `ports:` tương ứng trong `docker-compose.yml` ở production (xem mục 8) |
| `APP_TZ` | Múi giờ tính "ngày học", streak | `Asia/Ho_Chi_Minh` |
| `AUTO_MIGRATE` | Tự chạy migration SQL khi API khởi động | Để mặc định `true` (bỏ qua, không cần set) |
| `INGEST_ON_START` | Tự nạp lại `docs-v2` mỗi lần API khởi động | `true` lần đầu deploy; có thể để `false` sau đó và nạp thủ công (mục 6) để tránh tốn thời gian khởi động mỗi lần restart |

`.env` **không được commit** (đã có trong `.gitignore`/`.dockerignore`) — giữ riêng trên máy chủ, có backup an toàn (chứa `SESSION_SECRET`, mật khẩu DB).

## 5. Build và chạy

```bash
docker compose build
docker compose up -d
docker compose ps        # cả 3 service phải "healthy"/"running"
docker compose logs -f api   # theo dõi lúc migrate + ingest lần đầu
```

Lần đầu khởi động, `api` sẽ:
1. Chạy toàn bộ migration trong `db/migrations/` (lên tới `0021_quiz_lessons.sql` ở thời điểm viết tài liệu này) — idempotent, bỏ qua migration đã áp dụng theo **tên file** (không so checksum).
2. Nếu `INGEST_ON_START=true`: đọc `docs-v2` và nạp vào DB. Nếu thư mục `docs-v2` lỗi/thiếu, API vẫn khởi động bình thường (dữ liệu đã nạp trước đó không bị mất) — lỗi được log, không crash.

## 6. Kiểm tra sau khi deploy

- `curl http://<host>:<WEB_PORT>/api/health` → `{"status":"ok"}`.
- Mở `http://<host>:<WEB_PORT>` → trang đăng nhập hiện ra.
- Đăng nhập bằng `ADMIN_USER`/`ADMIN_PASSWORD` đã đặt ở `.env`.
- Vào trang **Admin** → kiểm tra số lượng topic/lesson đã nạp đúng (nếu `INGEST_ON_START=false`, bấm nút nạp nội dung trong Admin, hoặc chạy thủ công):
  ```bash
  docker compose exec api npm run ingest
  ```
- Chạy migration thủ công (hiếm khi cần, vì đã tự động lúc khởi động):
  ```bash
  docker compose exec api npm run migrate
  ```

## 7. Expose ra Internet qua tên miền + HTTPS

Container `web` chỉ phục vụ HTTP thuần ở cổng `80` (map ra `WEB_PORT` trên host). Để có HTTPS/tên miền, đặt một reverse proxy phía trước (khuyến nghị **Caddy** vì tự xin chứng chỉ Let's Encrypt, hoặc Nginx + Certbot):

**Caddy (đơn giản nhất)** — chạy trên host hoặc thêm 1 service Caddy vào compose, ví dụ `Caddyfile`:
```
hoc.example.com {
  reverse_proxy localhost:8080
}
```
Caddy tự lấy và gia hạn chứng chỉ TLS, forward WebSocket (`/api/ws`) không cần cấu hình thêm (Caddy mặc định hỗ trợ Upgrade header).

**Nginx ngoài + Certbot**: cấu hình tương tự `apps/web/nginx.conf` (đã có `proxy_set_header Upgrade/Connection` cho WebSocket), thêm `listen 443 ssl;` và chứng chỉ từ Certbot, `proxy_pass` tới `http://127.0.0.1:8080`.

Sau khi có domain, nếu muốn hạn chế CORS đúng domain đó thay vì phản xạ mọi origin (`origin: true` hiện tại trong `apps/api/src/app.js`), cần sửa code — xem mục 8.

## 8. Checklist bảo mật trước khi lên production

- [ ] Đổi `SESSION_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` khỏi giá trị mặc định/dev.
- [ ] Bỏ phần `ports: ["${DB_PORT}:5432"]` của service `db` trong `docker-compose.yml` (hoặc chỉ bind `127.0.0.1:5432:5432`) — DB không cần mở ra ngoài, `api` gọi qua network nội bộ của Compose (`db:5432`).
- [ ] Tương tự cân nhắc bỏ `ports` của `api` (`3000`) nếu không cần gọi trực tiếp để debug — mọi traffic nên đi qua `web`/reverse proxy.
- [ ] Mount `docs-v2` đang là `:ro` (read-only) — giữ nguyên, API không cần ghi vào đó.
- [ ] CORS hiện tại (`origin: true, credentials: true` ở `apps/api/src/app.js`) phản xạ mọi origin gửi lên — do web luôn gọi API cùng origin qua nginx proxy nên an toàn trong kiến trúc này, nhưng nếu API bị expose ra domain riêng (public), nên sửa thành whitelist domain thật.
- [ ] Đặt lịch backup DB định kỳ (mục 9).
- [ ] Giới hạn SSH/Docker daemon truy cập từ ngoài; cập nhật OS/Docker thường xuyên.

## 9. Backup & restore DB

**Backup** (chạy trên host, không cần dừng service):
```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

**Restore** vào một DB trống:
```bash
cat backup_2026-11-10.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Volume `kemtech_pgdata` cũng có thể sao lưu trực tiếp (`docker run --rm -v kemtech_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata.tgz /data`) nhưng cần dừng `db` trước để nhất quán.

## 10. Cập nhật lên phiên bản mới (redeploy)

```bash
git pull
docker compose build
docker compose up -d
```

- Migration mới trong `db/migrations/` tự chạy khi `api` khởi động lại (bước 5).
- Nếu nội dung `docs-v2` đã thay đổi, nạp lại: `docker compose exec api npm run ingest` (hoặc nút nạp trong Admin).
- Downtime khi redeploy: ngắn (vài giây tới vài chục giây tùy tốc độ `docker compose build`/pull image); muốn zero-downtime cần thêm blue-green/rolling deploy — ngoài phạm vi compose đơn giản này.

## 11. Theo dõi & gỡ lỗi

- `docker compose logs -f api` / `web` / `db` — log lỗi 500 của API in ra dạng `[api] METHOD URL -> 500: ...` (xem `docs/DEVELOPMENT.md`).
- `docker compose exec db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"` — kiểm tra DB sống.
- Nếu `api` không khởi động được: kiểm tra `DATABASE_URL` được compose tự ráp từ `POSTGRES_*` (không cần set tay trong `.env` khi dùng Compose) và container `db` đã ở trạng thái `healthy` (`depends_on: condition: service_healthy` đã đảm bảo thứ tự, nhưng nếu `db` crash loop thì `api` sẽ không start).
- Trang trắng khi mở web nhưng gọi `/api/health` trực tiếp vẫn OK: kiểm tra log container `web` (nginx) và đúng `proxy_pass http://api:3000` (tên service trong cùng network Compose, không phải `localhost`).
